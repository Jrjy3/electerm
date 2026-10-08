/**
 * Which Windows 11 backdrop material the window should use.
 *
 * With the system title bar the window is framed, and a framed window can't
 * be transparent on its own: lowering opacity would only show black behind
 * the content. So when opacity < 1 and no material is chosen, fall back to
 * acrylic (blur), which is the see-through effect a framed window can have.
 * Mirrors effectiveMaterial() in client/components/common/opacity.jsx.
 */
const MATERIALS = ['none', 'acrylic', 'mica', 'tabbed']

function getEffectiveMaterial ({ windowBackgroundMaterial, opacity = 1, useSystemTitleBar } = {}) {
  const material = MATERIALS.includes(windowBackgroundMaterial) ? windowBackgroundMaterial : 'none'
  if (material === 'none' && useSystemTitleBar && opacity < 1) {
    return 'acrylic'
  }
  return material
}

module.exports = { getEffectiveMaterial, MATERIALS }
