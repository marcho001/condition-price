// 辅助函数：将十六进制颜色转换为 RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  
  // 辅助函数：将 RGB 转换为十六进制颜色
  function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // 辅助函数：调整颜色亮度
  function adjustBrightness(hex, factor) {
    const rgb = hexToRgb(hex);
    const newRgb = rgb.map((val) =>
      Math.max(0, Math.min(255, Math.round(val + (255 - val) * factor)))
    );
    return rgbToHex(...newRgb);
  }
  
  export function generateThemeColors(primary) {
    const colors = {
      primary
    };
  
    // 生成浅色变体
    for (let i = 1; i <= 9; i++) {
      const factor = i * 0.1;
      colors[`primary-light-${i}`] = adjustBrightness(primary, factor);
    }
  
    // 生成深色变体
    colors["primary-dark-2"] = adjustBrightness(primary, -0.2);
  
    return colors;
  }
  
  export function applyTheme(colors) {
    const el = document.documentElement;
  
    Object.entries(colors).forEach(([key, value]) => {
      el.style.setProperty(`--el-color-${key}`, value);
    });
  }
  
  export function toggleDarkMode(isDark) {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
  