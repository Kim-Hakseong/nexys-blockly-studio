/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled to prevent Blockly from being injected twice in dev — the
  // second mount stacks an extra workspace on the container, so every
  // flyout drag/duplicate creates two blocks at the same coordinate.
  reactStrictMode: false,
  // @wokwi/elements + lit ship modern ESM — transpile so Next can bundle them.
  transpilePackages: ['blockly', '@wokwi/elements', 'lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
};

export default nextConfig;
