import { z } from "zod";

/** Validate at every API boundary. Never treat validation as HTML sanitization. */
export const idSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_:.\-]+$/);
export const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const quantitySchema = z.number().int().min(1).max(20);
export const euroMinorSchema = z.number().int().nonnegative().max(100_000_000);
export const checkoutRequestSchema = z.object({
  items: z.array(z.object({ productId: idSchema, quantity: quantitySchema })).min(1).max(50),
  currency: z.literal("eur"),
}).strict();

export async function parseJson<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; status: 400 | 413; error: string }
> {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 32_768) return { success: false, status: 413, error: "Request body too large" };
  let input: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32_768) return { success: false, status: 413, error: "Request body too large" };
    input = JSON.parse(raw);
  } catch {
    return { success: false, status: 400, error: "Invalid JSON" };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, status: 400, error: "Invalid request data" };
  return { success: true, data: parsed.data };
}
