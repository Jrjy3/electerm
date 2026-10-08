import { useEffect, useRef } from 'react'
import eq from 'fast-deep-equal'
import { isWin } from '../../common/constants'

const opacityDomId = 'opacity-style'

// With the system title bar the window is framed and can't be transparent on
// its own (opacity < 1 would only show black), so fall back to acrylic blur.
// Mirrors getEffectiveMaterial() in app/common/window-material.js.
function effectiveMaterial (material, opacity) {
  const m = material || 'none'
  if (m === 'none' && opacity < 1 && isWin && window.store.config.useSystemTitleBar) {
    return 'acrylic'
  }
  return m
}

/**
 * Opacity component
 * Handles conditional CSS rendering based on opacity setting
 * @param {Object} props
 * @param {number} props.opacity - Opacity value from store.config
 * @param {string} props.material - Windows 11 backdrop material from store.config
 *   (none | acrylic | mica | tabbed); blurs whatever is behind the window
 * @returns {null}
 */
export default function Opacity ({ opacity, material }) {
  // Default to 1 if opacity is not provided.
  // window opacity is electron-only: this component is lazy-loaded and never
  // rendered (nor loaded) in web app — see main.jsx
  const currentOpacity = opacity !== undefined ? opacity : 1
  const currentMaterial = effectiveMaterial(material, currentOpacity)
  const prevRef = useRef(null)

  function applyOpacity () {
    let styleElement = document.getElementById(opacityDomId)

    // Create style element if it doesn't exist
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = opacityDomId
      document.head.appendChild(styleElement)
    }

    window.pre.runGlobalAsync('setBackgroundMaterial', currentMaterial)
    // A backdrop material only shows through a transparent page, so it needs
    // the same transparent setup as opacity < 1
    if (currentOpacity === 1 && currentMaterial === 'none') {
      styleElement.innerHTML = ''
      window.pre.runGlobalAsync('setBackgroundColor', '#333333')
    } else {
      window.pre.runGlobalAsync('setBackgroundColor', '#33333300')
      styleElement.innerHTML = `
        html {
          background: transparent !important;
        }
        body {
          background: transparent !important;
        }
        #outside-context {
          opacity: ${currentOpacity} !important;
        }
      `
    }
  }

  useEffect(() => {
    applyOpacity()

    // Cleanup function
    return () => {
      const styleElement = document.getElementById(opacityDomId)
      if (styleElement) {
        document.head.removeChild(styleElement)
      }
    }
  }, [])

  useEffect(() => {
    const current = [currentOpacity, currentMaterial]
    if (prevRef.current && !eq(prevRef.current, current)) {
      applyOpacity()
    }
    prevRef.current = current
  }, [currentOpacity, currentMaterial])

  return null
}
