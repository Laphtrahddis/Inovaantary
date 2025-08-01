export interface Item {
  _id: string; // ✅ explicitly declare _id
  id?: string;
  UNIQID: string;
  productName: string;
  description?: string;
  phoneNumber?: string;
  category: string;
  quantity: number;
  price: number;
  dateAdded: string;

  [key: string]: any; // keep this if you still want flexibility
}
