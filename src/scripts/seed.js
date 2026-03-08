require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User.model');
const Book = require('../models/Book.model');
const Service = require('../models/Service.model');
const Hotel = require('../models/Hotel.model');
const logger = require('../utils/logger');

const sampleUsers = [
  {
    email: 'admin@sofiass.com',
    password: 'Admin123!',
    firstName: 'Sofia',
    lastName: 'Admin',
    role: 'admin',
    emailVerified: true,
    phone: '+237699887766'
  },
  {
    email: 'manager@sofiass.com',
    password: 'Manager123!',
    firstName: 'Hotel',
    lastName: 'Manager',
    role: 'hotel_manager',
    emailVerified: true,
    phone: '+237677889900'
  },
  {
    email: 'user@sofiass.com',
    password: 'User123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    emailVerified: true,
    phone: '+237655443322'
  }
];

// ✅ Champ "language" retiré — conflit avec l'index text MongoDB
// MongoDB interprète "language" comme un language override et rejette "Français"
const sampleBooks = [
  {
    title: "Transformation Digitale en Afrique",
    author: "Sofia Editions",
    description: "Un ouvrage de reference sur les enjeux, opportunites et strategies de la digitalisation en contexte africain.",
    shortDescription: "Guide complet de la transformation digitale pour les entreprises africaines",
    price: 12000,
    currency: "XAF",
    stock: 25,
    category: "digital",
    coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop"
    ],
    formats: ["Papier", "PDF"],
    rating: 4.6,
    featured: true,
    isbn: "978-2-1234-5678-9",
    pages: 320,
    publishedDate: new Date('2023-01-15'),
    publisher: "Editions Sofia",
    weight: 450,
    dimensions: { height: 23, width: 15, depth: 2 },
    tags: ["digital", "afrique", "transformation", "entreprise"],
    status: "active"
  },
  {
    title: "Gestion Moderne de l'Hotellerie",
    author: "Collectif Sofia",
    description: "Guide pratique pour optimiser la gestion et la rentabilite des etablissements hoteliers en Afrique.",
    shortDescription: "Manuel de gestion hoteliere adapte au contexte africain",
    price: 15000,
    currency: "XAF",
    stock: 12,
    category: "management",
    coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=600&fit=crop",
    images: [],
    formats: ["Papier"],
    rating: 4.3,
    featured: false,
    isbn: "978-2-1234-5679-6",
    pages: 280,
    publishedDate: new Date('2023-03-20'),
    publisher: "Editions Sofia",
    weight: 400,
    dimensions: { height: 21, width: 14, depth: 2 },
    tags: ["hotellerie", "management", "afrique"],
    status: "active"
  },
  {
    title: "Marketing Digital pour PME",
    author: "Marie Koffi",
    description: "Strategies digitales accessibles et efficaces pour les petites et moyennes entreprises africaines.",
    shortDescription: "Strategies digitales pour PME africaines",
    price: 9500,
    currency: "XAF",
    stock: 18,
    category: "marketing",
    coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=600&fit=crop",
    images: [],
    formats: ["Papier", "PDF", "EPUB"],
    rating: 4.8,
    featured: true,
    isbn: "978-2-1234-5680-2",
    pages: 240,
    publishedDate: new Date('2023-06-10'),
    publisher: "Editions Sofia",
    weight: 350,
    dimensions: { height: 20, width: 13, depth: 1.5 },
    tags: ["marketing", "pme", "digital", "afrique"],
    status: "active"
  }
];

// ✅ Slugs explicites — insertMany ne déclenche pas pre('save')
const sampleServices = [
  {
    title: "Librairie Digitale",
    slug: "librairie-digitale",
    tagline: "Librairie en ligne officielle de Sofia",
    description: "Plateforme e-commerce dediee a la vente en ligne des ouvrages Sofia et autres livres specialises.",
    heroText: "Decouvrez et commandez en ligne les ouvrages Sofia.",
    icon: "BookOpen",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=400&fit=crop",
    features: [
      { title: "Vente en ligne", description: "Achat securise de livres specialises", icon: "ShoppingCart" },
      { title: "Compte client", description: "Historique d'achats et preferences", icon: "Users" },
      { title: "Catalogue riche", description: "Livres structures par categories", icon: "BarChart3" },
      { title: "Paiement securise", description: "Transactions 100% securisees", icon: "ShieldCheck" }
    ],
    testimonials: [
      { name: "Responsable Librairie", role: "Direction", quote: "La librairie en ligne a permis d'elargir notre audience", rating: 5 }
    ],
    category: "digital",
    order: 1,
    isActive: true
  },
  {
    title: "Digitalisation Hoteliere",
    slug: "digitalisation-hoteliere",
    tagline: "Optimisez la gestion de vos etablissements",
    description: "Solution complete pour la gestion hoteliere et les demandes de reservation en ligne.",
    heroText: "Centralisez vos operations hotelieres et ameliorez l'experience client.",
    icon: "Hotel",
    coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop",
    features: [
      { title: "Gestion des chambres", description: "Suivi en temps reel", icon: "Hotel" },
      { title: "Reservations en ligne", description: "Systeme de booking integre", icon: "CalendarCheck" },
      { title: "Tableau de bord", description: "Analytics et reporting", icon: "TrendingUp" },
      { title: "Support 24/7", description: "Assistance technique permanente", icon: "Headphones" }
    ],
    category: "digital",
    order: 2,
    isActive: true
  }
];

// ✅ Slug explicite — insertMany ne déclenche pas pre('save')
const sampleHotels = [
  {
    name: "Hotel Sofia Palace",
    slug: "hotel-sofia-palace",
    description: "Hotel 4 etoiles au coeur de Douala, offrant un melange parfait de luxe et de technologie.",
    shortDescription: "Hotel 4* high-tech a Douala",
    address: {
      street: "Rue des Banques, Akwa",
      city: "Douala",
      postalCode: "BP 1234",
      country: "Cameroun",
      coordinates: { lat: 4.0511, lng: 9.7679 }
    },
    contact: {
      phone: "+237233445566",
      email: "contact@sofiapalace.com",
      website: "https://sofiapalace.com"
    },
    stars: 4,
    amenities: ["wifi", "piscine", "spa", "restaurant", "parking", "salle_de_sport"],
    coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop"
    ],
    rooms: [
      {
        type: "standard",
        name: "Chambre Standard",
        description: "Chambre confortable avec lit double, salle de bain privee et wifi gratuit.",
        pricePerNight: 35000,
        currency: "XAF",
        capacity: { adults: 2, children: 1 },
        amenities: ["wifi", "tv", "climatisation", "minibar"],
        images: [],
        totalRooms: 20,
        availableRooms: 15,
        isActive: true
      },
      {
        type: "suite",
        name: "Suite Executive",
        description: "Suite spacieuse avec salon separe, vue sur la ville et services premium.",
        pricePerNight: 75000,
        currency: "XAF",
        capacity: { adults: 2, children: 2 },
        amenities: ["wifi", "tv", "climatisation", "minibar", "jacuzzi", "terrasse"],
        images: [],
        totalRooms: 5,
        availableRooms: 3,
        isActive: true
      }
    ],
    policies: {
      checkIn: "14:00",
      checkOut: "12:00",
      cancellation: "Annulation gratuite jusqu'a 48h avant l'arrivee",
      children: "Enfants de moins de 12 ans gratuits",
      pets: "Animaux non acceptes"
    },
    isActive: true,
    status: "active"
  }
];

async function seedDatabase() {
  try {
    // Si appelé depuis app.js, la DB est déjà connectée
    // Si appelé directement via CLI, on connecte
    if (mongoose.connection.readyState === 0) {
      await connectDB();
      logger.info('📊 Connexion a la base de donnees etablie');
    }

    // Supprime les données existantes
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Service.deleteMany({}),
      Hotel.deleteMany({})
    ]);
    logger.info('🗑️  Anciennes donnees supprimees');

    // ✅ User.create() déclenche pre('save') → hash automatique du password
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    logger.info(`👥 ${createdUsers.length} utilisateurs crees`);

    // ✅ Books — insertMany OK (pas de slug unique requis)
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const booksWithCreator = sampleBooks.map(book => ({ ...book, createdBy: adminUser._id }));
    const createdBooks = await Book.insertMany(booksWithCreator);
    logger.info(`📚 ${createdBooks.length} livres crees`);

    // ✅ Services — slugs explicites dans les données
    const createdServices = await Service.insertMany(sampleServices);
    logger.info(`🛠️  ${createdServices.length} services crees`);

    // ✅ Hotels — slug explicite dans les données
    const managerUser = createdUsers.find(u => u.role === 'hotel_manager');
    const hotelsWithManager = sampleHotels.map(hotel => ({ ...hotel, manager: managerUser._id }));
    const createdHotels = await Hotel.insertMany(hotelsWithManager);
    logger.info(`🏨 ${createdHotels.length} hotels crees`);

    logger.info('✅ Base de donnees peuplee avec succes');

    console.log('\n📋 CREDENTIALS DE TEST:');
    console.log('=====================');
    sampleUsers.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
    });

    if (require.main === module) {
      process.exit(0);
    }

  } catch (error) {
    logger.error(`❌ Erreur lors du peuplement: ${error.message}`);
    console.error(error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;