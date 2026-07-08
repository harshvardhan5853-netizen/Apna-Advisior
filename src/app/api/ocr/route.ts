/**
 * Legacy OCR endpoint — forwards to the unified extract pipeline.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export { GET, POST } from "../extract/route";
