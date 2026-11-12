import { redirect } from "next/navigation";

/** Legacy path — catalog lives under /products, prices on product detail pages. */
export default function PricingPage() {
  redirect("/products");
}
