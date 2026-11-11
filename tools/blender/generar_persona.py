"""Genera personas realistas (MPFB / MakeHuman, CC0) atadas al esqueleto de Mesh2Motion.

Uso (sin interfaz):
  blender --background --factory-startup --python tools/blender/generar_persona.py -- <salida_dir> [nombre ...]

Sin nombres genera todas las de PERSONAS. Cada persona sale como <salida_dir>/<nombre>.glb (sin optimizar;
luego pasa por tools/blender/optimizar.sh). Necesita la extensión MPFB y los assets CC0 de MakeHuman
instalados (ver docs/MODELOS.md).

Cómo funciona:
  1. Importa public/models/maniqui.glb solo para obtener la armadura de Mesh2Motion (66 huesos) con sus
     orientaciones de reposo intactas (bone_heuristic='BLENDER' conserva los ejes de los nodos glTF).
  2. Crea el humano con MPFB (macros de sexo/edad/peso...), le pone el rig 'game_engine' de MPFB, cuyos
     huesos se llaman igual que los de Mesh2Motion (pelvis, spine_01, upperarm_l...), con sus pesos
     de MakeHuman; añade proxy de cuerpo, piel, ojos, cejas, pelo y ropa (materiales GAMEENGINE).
  3. Pone el rig de MPFB en la pose de reposo de Mesh2Motion (T) girando cada hueso para que apunte
     igual que su homólogo, y hornea cuerpo y ropa en esa pose.
  4. Mueve las articulaciones de la armadura de Mesh2Motion a las del humano SIN cambiar su orientación
     (así las rotaciones de las animaciones CC0 siguen valiendo) y ata las mallas con los pesos de MPFB.
  5. Reduce triángulos y exporta GLB.
"""
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MANIQUI = os.path.join(ROOT, "public", "models", "maniqui.glb")

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.assetservice import AssetService

# Ropa: (fragmento de ruta del .mhclo dentro de data/clothes, nombre de material final para teñir)
PERSONAS = {
    "campesino": dict(
        macros=dict(gender=1.0, age=0.5, muscle=0.6, weight=0.45, height=0.45, proportions=0.6,
                    race=dict(african=0.25, asian=0.35, caucasian=0.4)),
        skin="middleage_caucasian_male/middleage_caucasian_male.mhmat", skin_tint=(0.80, 0.62, 0.48),
        proxy="male_generic/male_generic.proxy",
        clothes=[("male_casualsuit01/male_casualsuit01.mhclo", "cloth"), ("shoes01/shoes01.mhclo", "shoes")],
        hair="short02/short02.mhclo", eyebrows="eyebrow001/eyebrow001.mhclo", sex="m", height=1.68),
    "campesino-viejo": dict(
        macros=dict(gender=1.0, age=0.95, muscle=0.4, weight=0.4, height=0.35, proportions=0.5,
                    race=dict(african=0.2, asian=0.35, caucasian=0.45)),
        skin="old_caucasian_male/old_caucasian_male.mhmat", skin_tint=(0.80, 0.62, 0.50),
        proxy="male_generic/male_generic.proxy",
        clothes=[("male_casualsuit03/male_casualsuit03.mhclo", "cloth"), ("shoes01/shoes01.mhclo", "shoes")],
        hair="short01/short01.mhclo", eyebrows="eyebrow002/eyebrow002.mhclo", sex="m", height=1.64, hair_color=(0.75, 0.75, 0.72)),
    "campesina": dict(
        macros=dict(gender=0.0, age=0.5, muscle=0.5, weight=0.5, height=0.4, proportions=0.6, cupsize=0.5,
                    race=dict(african=0.25, asian=0.35, caucasian=0.4)),
        skin="middleage_caucasian_female/middleage_caucasian_female.mhmat", skin_tint=(0.82, 0.64, 0.50),
        proxy="female_generic/female_generic.proxy",
        clothes=[("female_elegantsuit01/female_elegantsuit01.mhclo", "cloth"), ("shoes01/shoes01.mhclo", "shoes")],
        hair="braid01/braid01.mhclo", eyebrows="eyebrow010/eyebrow010.mhclo", sex="f", height=1.58, skirt=True),
    "campesina-vieja": dict(
        macros=dict(gender=0.0, age=0.95, muscle=0.4, weight=0.6, height=0.3, proportions=0.5, cupsize=0.4,
                    race=dict(african=0.2, asian=0.35, caucasian=0.45)),
        skin="old_caucasian_female/old_caucasian_female.mhmat", skin_tint=(0.80, 0.62, 0.50),
        proxy="female_generic/female_generic.proxy",
        clothes=[("female_elegantsuit01/female_elegantsuit01.mhclo", "cloth"), ("shoes04/shoes04.mhclo", "shoes")],
        hair="bob02/bob02.mhclo", eyebrows="eyebrow010/eyebrow010.mhclo", sex="f", height=1.54, skirt=True, hair_color=(0.78, 0.78, 0.76)),
}

TRI_BUDGET = 11500

# hueso -> hijo que define su dirección (en ambos esqueletos)
DIR_CHILD = {
    "spine_01": "spine_02", "spine_02": "spine_03", "spine_03": "neck_01", "neck_01": "head",
    "clavicle_l": "upperarm_l", "upperarm_l": "lowerarm_l", "lowerarm_l": "hand_l", "hand_l": "middle_01_l",
    "clavicle_r": "upperarm_r", "upperarm_r": "lowerarm_r", "lowerarm_r": "hand_r", "hand_r": "middle_01_r",
    "thigh_l": "calf_l", "calf_l": "foot_l", "foot_l": "ball_l",
    "thigh_r": "calf_r", "calf_r": "foot_r", "foot_r": "ball_r",
}
for s in "lr":
    for f in ["index", "middle", "ring", "pinky", "thumb"]:
        DIR_CHILD[f"{f}_01_{s}"] = f"{f}_02_{s}"
        DIR_CHILD[f"{f}_02_{s}"] = f"{f}_03_{s}"
# en M2M la punta la marca la hoja; en MPFB, la cola del hueso
LEAF = {"head": "head_leaf", "ball_l": "ball_leaf_l", "ball_r": "ball_leaf_r"}
for s in "lr":
    for f in ["index", "middle", "ring", "pinky", "thumb"]:
        LEAF[f"{f}_03_{s}"] = f"{f}_04_leaf_{s}"


def log(*a):
    print("[persona]", *a, flush=True)


def asset(sub, frag):
    p = AssetService.find_asset_absolute_path(frag, sub)
    if not p:
        raise RuntimeError(f"asset no encontrado: {sub}/{frag}")
    return p


def import_m2m():
    bpy.ops.import_scene.gltf(filepath=MANIQUI, bone_heuristic="BLENDER")
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    arm.name = "M2M"
    return arm


def heads(arm):
    return {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}


def pose_heads(rig):
    return {p.name: rig.matrix_world @ p.head for p in rig.pose.bones}, {p.name: rig.matrix_world @ p.tail for p in rig.pose.bones}


def pose_to_m2m(rig, m2m):
    """Gira los huesos del rig de MPFB para que apunten como los de Mesh2Motion en reposo."""
    mh = heads(m2m)
    order = [b.name for b in rig.data.bones]  # padres antes que hijos
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for name in order:
        if name not in DIR_CHILD and name not in LEAF:
            continue
        pb = rig.pose.bones[name]
        bpy.context.view_layer.update()
        h, t = pose_heads(rig)
        child = DIR_CHILD.get(name)
        if child and child in h:
            d_src = h[child] - h[name]
            d_dst = mh[child] - mh[name]
        else:
            d_src = t[name] - h[name]
            d_dst = mh[LEAF[name]] - mh[name]
        if d_src.length < 1e-6 or d_dst.length < 1e-6:
            continue
        q = d_src.normalized().rotation_difference(d_dst.normalized())
        W = rig.matrix_world @ pb.matrix
        pivot = h[name]
        W2 = Matrix.Translation(pivot) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pivot) @ W
        pb.matrix = rig.matrix_world.inverted() @ W2
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(obj, name):
    """Malla evaluada (forma, máscaras, pose) como objeto nuevo sin modificadores, con grupos de vértices."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    me.transform(obj.matrix_world)
    new = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(new)
    # new_from_object conserva los pesos pero los nombres de grupo vienen del objeto original
    for vg in obj.vertex_groups:
        if vg.name not in new.vertex_groups:
            new.vertex_groups.new(name=vg.name)
    return new


def tri_count(objs):
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)


def build(name, cfg, outdir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m2m = import_m2m()

    macros = dict(gender=0.5, age=0.5, muscle=0.5, weight=0.5, proportions=0.5, height=0.5, cupsize=0.5, firmness=0.5)
    macros.update(cfg["macros"])
    bm = HumanService.create_human(macro_detail_dict=macros, feet_on_ground=True)
    HumanService.add_builtin_rig(bm, "game_engine")
    rig = bm.parent
    parts = []  # (objeto, nombre material final)
    if cfg.get("proxy"):
        prx = HumanService.add_mhclo_asset(asset("proxymeshes", cfg["proxy"]), bm, asset_type="Proxymeshes", subdiv_levels=0, material_type="GAMEENGINE")
    else:
        prx = None
    HumanService.set_character_skin(asset("skins", cfg["skin"]), bm, bodyproxy=prx, skin_type="GAMEENGINE", material_instances=False)
    eyes = HumanService.add_mhclo_asset(asset("eyes", "low-poly/low-poly.mhclo"), bm, asset_type="Eyes", subdiv_levels=0, material_type="GAMEENGINE")
    parts.append((eyes, "eyes"))
    brows = HumanService.add_mhclo_asset(asset("eyebrows", cfg["eyebrows"]), bm, asset_type="Eyebrows", subdiv_levels=0, material_type="GAMEENGINE")
    parts.append((brows, "eyebrows"))
    hair = HumanService.add_mhclo_asset(asset("hair", cfg["hair"]), bm, asset_type="Hair", subdiv_levels=0, material_type="GAMEENGINE")
    parts.append((hair, "hair"))
    for frag, mat in cfg["clothes"]:
        c = HumanService.add_mhclo_asset(asset("clothes", frag), bm, asset_type="Clothes", subdiv_levels=0, material_type="GAMEENGINE")
        parts.append((c, mat))
    body = prx or bm
    parts.insert(0, (body, "skin"))

    # alinear a la pose de reposo de Mesh2Motion y hornear
    pose_to_m2m(rig, m2m)
    h, t = pose_heads(rig)
    baked = []
    for obj, mat in parts:
        b = bake(obj, mat)
        for m in b.data.materials:
            if m:
                m.name = f"{mat}"
        baked.append((b, mat))
        log("parte", obj.name, "->", mat, tri_count([b]), "tri")

    # escalar el esqueleto de M2M y llevar sus articulaciones a las del humano, sin girar ningún hueso
    bpy.context.view_layer.objects.active = m2m
    bpy.ops.object.mode_set(mode="EDIT")
    ebs = m2m.data.edit_bones
    old = {e.name: e.head.copy() for e in ebs}
    for e in ebs:
        e.use_connect = False
    ratio = (h["head"].z - h["Root"].z) / (old["head"].z - old["root"].z)
    target = {}
    for e in ebs:
        n = e.name
        if n == "root":
            target[n] = h["Root"]
        elif n in h:
            target[n] = h[n]
    for parent, leaf in LEAF.items():
        if leaf in old:
            target[leaf] = t[parent] if parent in t else None
    for e in ebs:
        p = target.get(e.name)
        if p is None:  # hojas sin homólogo: offset del padre escalado
            par = e.parent
            p = target[par.name] + (old[e.name] - old[par.name]) * ratio
            target[e.name] = p
        M = e.matrix.copy()
        length = e.length * ratio
        M.translation = p
        e.matrix = M
        e.length = max(length, 0.005)
    bpy.ops.object.mode_set(mode="OBJECT")

    # quitar MPFB y atar al esqueleto M2M
    for o in list(bpy.context.scene.objects):
        if o not in [m2m] + [b for b, _ in baked]:
            bpy.data.objects.remove(o, do_unlink=True)
    bones = {b.name for b in m2m.data.bones}
    for b, mat in baked:
        for vg in list(b.vertex_groups):
            if vg.name == "Root":
                vg.name = "root"
            elif vg.name not in bones:
                b.vertex_groups.remove(vg)
        b.parent = m2m
        mod = b.modifiers.new("Armature", "ARMATURE")
        mod.object = m2m

    # falda: los muslos atraviesan la tela al caminar; se borra la piel que la falda tapa
    if cfg.get("skirt"):
        skin = next(b for b, m in baked if m == "skin")
        zmin, zmax = target["calf_l"].z + 0.06, target["thigh_l"].z
        bmx = bmesh.new(); bmx.from_mesh(skin.data)
        kill = [v for v in bmx.verts if zmin < v.co.z < zmax]
        bmesh.ops.delete(bmx, geom=kill, context="VERTS")
        bmx.to_mesh(skin.data); bmx.free()
        log("falda: borrados", len(kill), "vértices de muslo")

    # reducir triángulos (no se tocan ojos, cejas ni pelo: el pelo son tarjetas con alfa y se rompe)
    objs = [b for b, _ in baked]
    total = tri_count(objs)
    fixed = tri_count([b for b, m in baked if m in ("eyes", "eyebrows", "hair")])
    if total > TRI_BUDGET:
        ratio_d = max(0.15, (TRI_BUDGET - fixed) / max(1, total - fixed))
        for b, mat in baked:
            if mat in ("eyes", "eyebrows", "hair"):
                continue
            d = b.modifiers.new("Decimate", "DECIMATE")
            d.ratio = ratio_d
            d.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = b
            bpy.ops.object.modifier_move_to_index(modifier="Decimate", index=0)
            bpy.ops.object.modifier_apply(modifier="Decimate")
    log("triángulos", total, "->", tri_count(objs))

    # unir partes con el mismo material final
    tint = cfg.get("skin_tint")
    hc = cfg.get("hair_color")
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        # solo pelo y cejas llevan transparencia; el resto se exporta opaco (evita problemas de orden)
        if not (m.name.startswith("hair") or m.name.startswith("eyebrows")):
            for l in list(m.node_tree.links):
                if l.to_node == bsdf and l.to_socket.name == "Alpha":
                    m.node_tree.links.remove(l)
            bsdf.inputs["Alpha"].default_value = 1.0
            m.use_backface_culling = not (m.name.startswith("cloth") and cfg.get("skirt"))
        bsdf.inputs["Roughness"].default_value = 0.8 if not m.name.startswith("eyes") else 0.2

    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, name + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    m2m.select_set(True)
    for b in objs:
        b.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_animations=False,
                              export_skins=True, export_morph=False, export_apply=False, export_yup=True,
                              export_image_format="AUTO", export_extras=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, name + ".blend"))
    log("exportado", out, os.path.getsize(out))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    outdir = argv[0] if argv else os.path.join(ROOT, ".test", "modelos", "out")
    names = argv[1:] or list(PERSONAS)
    for n in names:
        build(n, PERSONAS[n], outdir)


main()
