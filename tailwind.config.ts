import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      colors: {
        cream: {
          50: "#fbf7f1",
          100: "#f5ecdf",
          200: "#ead8bd",
        },
        brand: {
          50: "#f7f1ea",
          100: "#ecdcc6",
          200: "#d9b994",
          300: "#c39466",
          400: "#a87245",
          500: "#8a5a36",
          600: "#6f4828",
          700: "#553720",
          800: "#3d2818",
          900: "#2a1c11",
        },
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(85, 55, 32, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
