import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
    { id: '1', name: "Organic Rice (5kg)", price: 250, stock: 50, sold: 0, category: "agriculture", producer: "Juan Dela Cruz", producerId: "mock-1", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", description: "Fresh organic rice from local farms" },
    { id: '2', name: "Base", price: 450, stock: 30, sold: 0, category: "craft", producer: "Lola Artisans", producerId: "mock-2", image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400", description: "Handcrafted traditional base" },
    { id: '3', name: "Fresh Coconut", price: 50, stock: 100, sold: 0, category: "agriculture", producer: "Juan Dela Cruz", producerId: "mock-1", image: "https://images.unsplash.com/photo-1550581190-81f0d366d45a?w=400", description: "Sweet and refreshing young coconut" },
    { id: '4', name: "Wooden Sculpture", price: 1200, stock: 15, sold: 0, category: "craft", producer: "Mindoro Crafts", producerId: "mock-3", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400", description: "Intricate wooden carving" },
    { id: '5', name: "Organic Lettuce", price: 80, stock: 75, sold: 0, category: "agriculture", producer: "Green Farms", producerId: "mock-4", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400", description: "Crispy and fresh pesticide-free lettuce" },
    { id: '6', name: "Fresh Honey", price: 350, stock: 40, sold: 0, category: "agriculture", producer: "Beekeeper Co", producerId: "mock-5", image: "https://images.unsplash.com/photo-1587049352846-4a222e773a08?w=400", description: "Pure wild honey from the mountains" },
    { id: '7', name: "Calamansi", price: 50, stock: 105, sold: 0, category: "agriculture", producer: "Dexcem Gutierrez", producerId: "mock-6", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400", description: "Tangy local citrus" },
    { id: '8', name: "Lansones", price: 150, stock: 60, sold: 0, category: "agriculture", producer: "Roxas Orchard", producerId: "mock-7", image: "https://images.unsplash.com/photo-1621501438991-da55928f629c?w=400", description: "Sweet and juicy local lansones" }
];
