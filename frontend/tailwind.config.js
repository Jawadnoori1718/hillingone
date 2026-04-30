/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* HillingOne brand — teal primary */
        "hillingdon-navy":      "#2A5C5A",
        "hillingdon-navy-dark": "#1D4442",
        "hillingdon-navy-light":"#3D7573",
        "hillingdon-navy-tint": "#EAF2F1",
        /* HillingOne gold accent */
        "hillingdon-gold":      "#EAB830",
        "hillingdon-gold-light":"#F0C840",
        "hillingdon-gold-tint": "#FEF8E7",
        /* Legacy alias kept for any stray references */
        "hillingdon-green":     "#2A5C5A",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
