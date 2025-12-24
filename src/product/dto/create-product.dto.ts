export class CreateProductDto {
  name: string;
  image: string;
  stock: number;
  price: number;
  commission: number;
  weight: number;
  shippingCost: string;
  description: string;
  category: string;
}