import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WHY: build "standalone" = un'unica cartella autosufficiente con il proprio server Node, che il
  // Dockerfile copia nell'immagine finale senza node_modules completi. Immagine più piccola e avvio
  // deterministico su Railway.
  output: "standalone",
};

export default nextConfig;
