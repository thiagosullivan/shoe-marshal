import { z } from "zod";

export const productSchema = z.object({
  name: z.string({ message: "O nome é obrigatório!" }),
  description: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  price: z.number().min(1, { message: "O preço precisa ser positivo" }),
  images: z.array(z.string()).min(1, "At least one image is required"),
  category: z.enum(["men", "women", "kids"]),
  isFeatured: z.boolean().optional(),
});
