export default "@export ecgl.dof.coc\nuniform sampler2D depth;\nuniform float zNear: 0.1;\nuniform float zFar: 2000;\nuniform float focalDistance: 3;\nuniform float focalRange: 1;\nuniform float focalLength: 30;\nuniform float fstop: 2.8;\nvarying vec2 v_Texcoord;\n@import clay.util.encode_float\nvoid main()\n{\n float z = texture2D(depth, v_Texcoord).r * 2.0 - 1.0;\n float dist = 2.0 * zNear * zFar / (zFar + zNear - z * (zFar - zNear));\n float aperture = focalLength / fstop;\n float coc;\n float uppper = focalDistance + focalRange;\n float lower = focalDistance - focalRange;\n if (dist <= uppper && dist >= lower) {\n coc = 0.5;\n }\n else {\n float focalAdjusted = dist > uppper ? uppper : lower;\n coc = abs(aperture * (focalLength * (dist - focalAdjusted)) / (dist * (focalAdjusted - focalLength)));\n coc = clamp(coc, 0.0, 2.0) / 2.00001;\n if (dist < lower) {\n coc = -coc;\n }\n coc = coc * 0.5 + 0.5;\n }\n gl_FragColor = encodeFloat(coc);\n}\n@end\n@export ecgl.dof.composite\n#define DEBUG 0\nuniform sampler2D original;\nuniform sampler2D blurred;\nuniform sampler2D nearfield;\nuniform sampler2D coc;\nuniform sampler2D nearcoc;\nvarying vec2 v_Texcoord;\n@import clay.util.rgbm\n@import clay.util.float\nvoid main()\n{\n vec4 blurredColor = decodeHDR(texture2D(blurred, v_Texcoord));\n vec4 originalColor = decodeHDR(texture2D(original, v_Texcoord));\n float fCoc = decodeFloat(texture2D(coc, v_Texcoord));\n fCoc = abs(fCoc * 2.0 - 1.0);\n float weight = smoothstep(0.0, 1.0, fCoc);\n#ifdef NEARFIELD_ENABLED\n vec4 nearfieldColor = decodeHDR(texture2D(nearfield, v_Texcoord));\n float fNearCoc = decodeFloat(texture2D(nearcoc, v_Texcoord));\n fNearCoc = abs(fNearCoc * 2.0 - 1.0);\n gl_FragColor = encodeHDR(\n mix(\n nearfieldColor, mix(originalColor, blurredColor, weight),\n pow(1.0 - fNearCoc, 4.0)\n )\n );\n#else\n gl_FragColor = encodeHDR(mix(originalColor, blurredColor, weight));\n#endif\n}\n@end\n@export ecgl.dof.diskBlur\n#define POISSON_KERNEL_SIZE 16;\nuniform sampler2D texture;\nuniform sampler2D coc;\nvarying vec2 v_Texcoord;\nuniform float blurRadius : 10.0;\nuniform vec2 textureSize : [512.0, 512.0];\nuniform vec2 poissonKernel[POISSON_KERNEL_SIZE];\nuniform float percent;\nfloat nrand(const in vec2 n) {\n return fract(sin(dot(n.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\n@import clay.util.rgbm\n@import clay.util.float\nvoid main()\n{\n vec2 offset = blurRadius / textureSize;\n float rnd = 6.28318 * nrand(v_Texcoord + 0.07 * percent );\n float cosa = cos(rnd);\n float sina = sin(rnd);\n vec4 basis = vec4(cosa, -sina, sina, cosa);\n#if !defined(BLUR_NEARFIELD) && !defined(BLUR_COC)\n offset *= abs(decodeFloat(texture2D(coc, v_Texcoord)) * 2.0 - 1.0);\n#endif\n#ifdef BLUR_COC\n float cocSum = 0.0;\n#else\n vec4 color = vec4(0.0);\n#endif\n float weightSum = 0.0;\n for (int i = 0; i < POISSON_KERNEL_SIZE; i++) {\n vec2 ofs = poissonKernel[i];\n ofs = vec2(dot(ofs, basis.xy), dot(ofs, basis.zw));\n vec2 uv = v_Texcoord + ofs * offset;\n vec4 texel = texture2D(texture, uv);\n float w = 1.0;\n#ifdef BLUR_COC\n float fCoc = decodeFloat(texel) * 2.0 - 1.0;\n cocSum += clamp(fCoc, -1.0, 0.0) * w;\n#else\n texel = decodeHDR(texel);\n #if !defined(BLUR_NEARFIELD)\n float fCoc = decodeFloat(texture2D(coc, uv)) * 2.0 - 1.0;\n w *= abs(fCoc);\n #endif\n color += texel * w;\n#endif\n weightSum += w;\n }\n#ifdef BLUR_COC\n gl_FragColor = encodeFloat(clamp(cocSum / weightSum, -1.0, 0.0) * 0.5 + 0.5);\n#else\n color /= weightSum;\n gl_FragColor = encodeHDR(color);\n#endif\n}\n@end";
