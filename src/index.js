/********************************************************************
 * knowu.js
 *
 * The “knowu” library collects a wide range of fingerprint signals 
 * (canvas, WebGL info+extensions, fonts, screen, timezone, languages, 
 * plugins, audio fingerprint, hardware concurrency, device memory, 
 * CPU class, platform, color gamut, contrast, forced/inverted colors, 
 * monochrome depth, storage support, DOM blockers, PDF viewer enabled, 
 * architecture, Apple Pay, private click measurement, reduced motion/
 * transparency, vendor info/flavors, math fingerprint, touch support, etc.)
 *
 * Usage:
 *   const knowu = new Knowu("<backendUrl>", { sendOnLoad: true });
 *   knowu.record().then(fp => {
 *       console.log("Fingerprint:", fp);
 *       knowu.send(fp);
 *   });
 *
 ********************************************************************/
(function () {
  "use strict";

  // ----------------- Helper functions (all signals) ------------------

  function wait(ms, value) {
    return new Promise(resolve => setTimeout(resolve, ms, value));
  }

  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      const text = document.title || navigator.userAgent || "default";
      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#069";
      ctx.fillText(text, 10, 20);
      return canvas.toDataURL();
    } catch (e) {
      return null;
    }
  }

  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return null;
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        vendor: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR),
        renderer: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION)
      };
    } catch (e) {
      return null;
    }
  }

  function getWebGLExtensions() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      return gl ? gl.getSupportedExtensions() : [];
    } catch (e) {
      return [];
    }
  }

  function getFontsFingerprint() {
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const testString = "abcdefghijklmnopqrstuvwxyz0123456789";
    const testSize = "72px";
    const defaultWidths = {};
    function getWidth(font) {
      const span = document.createElement("span");
      span.style.fontSize = testSize;
      span.style.fontFamily = font;
      span.style.position = "absolute";
      span.style.visibility = "hidden";
      span.textContent = testString;
      document.body.appendChild(span);
      const width = span.offsetWidth;
      document.body.removeChild(span);
      return width;
    }
    baseFonts.forEach(font => {
      defaultWidths[font] = getWidth(font);
    });
    const fonts = ["Arial", "Verdana", "Times New Roman", "Courier New", "Comic Sans MS", "Georgia", "Trebuchet MS"];
    const available = [];
    fonts.forEach(font => {
      const detected = baseFonts.some(base => getWidth(`"${font}",${base}`) !== defaultWidths[base]);
      if (detected) available.push(font);
    });
    return available;
  }

  async function getPluginsFingerprint() {
    const plugins = [];
    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
    }
    return plugins;
  }

  async function getAudioFingerprint() {
    try {
      const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioCtx) return null;
      const context = new AudioCtx(1, 44100, 44100);
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 10000;
      const compressor = context.createDynamicsCompressor();
      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);
      const buffer = await context.startRendering();
      let sum = 0;
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        sum += Math.abs(data[i]);
      }
      return { fingerprint: sum, baseLatency: context.baseLatency || null };
    } catch (e) {
      return null;
    }
  }

  async function getDOMBlockers() {
    const selectors = [
      "#ad", ".ad", "[id*='ad-']", "[class*='ad_']", "[class*='advert']"
    ];
    const blocked = [];
    for (let selector of selectors) {
      const elems = document.querySelectorAll(selector);
      if (elems.length > 0) {
        let hidden = 0;
        elems.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) {
            hidden++;
          }
        });
        if (elems.length && hidden / elems.length > 0.5) blocked.push(selector);
      }
    }
    return blocked;
  }

  // ----------------- RECORDING FUNCTION -----------------

  async function recordFingerprint() {
    return {
      canvas: getCanvasFingerprint(),
      webgl: getWebGLFingerprint(),
      webglExtensions: getWebGLExtensions(),
      fonts: getFontsFingerprint(),
      screen: {
        resolution: [screen.width, screen.height],
        colorDepth: screen.colorDepth,
        availResolution: [screen.availWidth, screen.availHeight]
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
      languages: navigator.languages || [navigator.language],
      plugins: await getPluginsFingerprint(),
      audio: await getAudioFingerprint(),
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      cpuClass: navigator.cpuClass || null,
      platform: navigator.platform || null,
      colorGamut: (matchMedia("(color-gamut: rec2020)").matches) ? "rec2020" :
                  (matchMedia("(color-gamut: p3)").matches) ? "p3" :
                  (matchMedia("(color-gamut: srgb)").matches) ? "srgb" : null,
      contrast: (matchMedia("(prefers-contrast: more)").matches) ? "more" :
                (matchMedia("(prefers-contrast: less)").matches) ? "less" :
                (matchMedia("(prefers-contrast: no-preference)").matches) ? "none" : null,
      forcedColors: (matchMedia("(forced-colors: active)").matches) ? true :
                    (matchMedia("(forced-colors: none)").matches) ? false : null,
      invertedColors: (matchMedia("(inverted-colors: inverted)").matches) ? true :
                      (matchMedia("(inverted-colors: none)").matches) ? false : null,
      monochrome: (function () {
        if (!matchMedia("(min-monochrome: 0)").matches) return null;
        for (let i = 0; i <= 32; i++) {
          if (matchMedia(`(max-monochrome: ${i})`).matches) return i;
        }
        return null;
      })(),
      openDatabase: !!window.openDatabase,
      localStorage: (function () { try { return !!window.localStorage; } catch (e) { return true; } })(),
      sessionStorage: (function () { try { return !!window.sessionStorage; } catch (e) { return true; } })(),
      domBlockers: await getDOMBlockers(),
      pdfViewerEnabled: navigator.pdfViewerEnabled || null,
      architecture: (function () {
        try {
          const buffer = new ArrayBuffer(8);
          const f32 = new Float32Array(buffer);
          const u32 = new Uint32Array(buffer);
          f32[0] = 1.0;
          return u32[0] !== 0 ? "little" : "big";
        } catch (e) {
          return null;
        }
      })(),
      applePay: (typeof window.ApplePaySession !== "undefined") ? "available" : "unavailable",
      privateClickMeasurement: (function () {
        const a = document.createElement("a");
        return a.attributionSourceId || a.attributionsourceid || null;
      })(),
      reducedMotion: (matchMedia("(prefers-reduced-motion: reduce)").matches) ? true :
                     (matchMedia("(prefers-reduced-motion: no-preference)").matches) ? false : null,
      reducedTransparency: (matchMedia("(prefers-reduced-transparency: reduce)").matches) ? true :
                           (matchMedia("(prefers-reduced-transparency: no-preference)").matches) ? false : null,
      dateTimeLocale: (function () {
        try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { return null; }
      })(),
      touchSupport: (function () {
        return {
          maxTouchPoints: navigator.maxTouchPoints || 0,
          touchEvent: (function () { try { document.createEvent("TouchEvent"); return true; } catch (e) { return false; } })(),
          touchStart: "ontouchstart" in window
        };
      })(),
      vendor: navigator.vendor || null,
      vendorFlavors: (function () {
        const flavors = [];
        if (window.chrome && window.chrome.webstore) flavors.push("chrome");
        if (typeof window.safari !== "undefined") flavors.push("safari");
        if (window.opera || navigator.userAgent.indexOf("OPR/") !== -1) flavors.push("opera");
        return flavors;
      })(),
      math: (function () {
        return {
          acos: Math.acos(Math.PI / 4),
          asin: Math.asin(Math.PI / 4),
          atan: Math.atan(Math.PI / 4),
          sin: Math.sin(Math.PI / 4),
          cos: Math.cos(Math.PI / 4),
          tan: Math.tan(Math.PI / 4),
          exp: Math.exp(1),
          log: Math.log(10)
        };
      })(),
      audioBaseLatency: (function () {
        try {
          const AudioCtx = window.AudioContext;
          if (!AudioCtx) return null;
          const context = new AudioCtx();
          const latency = context.baseLatency || null;
          context.close();
          return latency;
        } catch (e) {
          return null;
        }
      })(),
      screenResolution: [screen.width, screen.height],
      recorded_at: new Date().toISOString()
    };
  }

  // ----------------- Knowu Class (Builder API) -----------------

  class Knowu {
    constructor(baseUrl, options = {}) {
      this.baseUrl = baseUrl;
      this.options = options;
      if (options.sendOnLoad) {
        window.addEventListener("load", () => {
          this.record().then(fp => this.send(fp));
        });
      }
    }
    async record() {
      return await recordFingerprint();
    }
    async send(fp) {
      if (!fp) {
        fp = await this.record();
      }
      return await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fp),
        mode: 'no-cors',
      });
    }
  }

  // Expose the API:
  window.Knowu = Knowu;
})();

