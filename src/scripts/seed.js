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

const sampleBooks = [
  {
    title: "Transformation Digitale en Afrique",
    author: "Sofia Éditions",
    description: "Un ouvrage de référence sur les enjeux, opportunités et stratégies de la digitalisation en contexte africain.",
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
    publisher: "Éditions Sofia",
    language: "Français",
    weight: 450,
    dimensions: { height: 23, width: 15, depth: 2 },
    tags: ["digital", "afrique", "transformation", "entreprise"],
    status: "active"
  },
  {
    title: "Gestion Moderne de l'Hôtellerie",
    author: "Collectif Sofia",
    description: "Guide pratique pour optimiser la gestion et la rentabilité des établissements hôteliers en Afrique.",
    shortDescription: "Manuel de gestion hôtelière adapté au contexte africain",
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
    publisher: "Éditions Sofia",
    language: "Français",
    weight: 400,
    dimensions: { height: 21, width: 14, depth: 2 },
    tags: ["hotellerie", "management", "afrique"],
    status: "active"
  },
  {
    title: "Marketing Digital pour PME",
    author: "Marie Koffi",
    description: "Stratégies digitales accessibles et efficaces pour les petites et moyennes entreprises africaines.",
    shortDescription: "Stratégies digitales pour PME africaines",
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
    publisher: "Éditions Sofia",
    language: "Français",
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
    description: "Plateforme e-commerce dédiée à la vente en ligne des ouvrages Sofia et autres livres spécialisés.",
    heroText: "Découvrez et commandez en ligne les ouvrages Sofia.",
    icon: "BookOpen",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=400&fit=crop",
    features: [
      { title: "Vente en ligne", description: "Achat sécurisé de livres spécialisés", icon: "ShoppingCart" },
      { title: "Compte client", description: "Historique d'achats et préférences", icon: "Users" },
      { title: "Catalogue riche", description: "Livres structurés par catégories", icon: "BarChart3" },
      { title: "Paiement sécurisé", description: "Transactions 100% sécurisées", icon: "ShieldCheck" }
    ],
    testimonials: [
      { name: "Responsable Librairie", role: "Direction", quote: "La librairie en ligne a permis d'élargir notre audience", rating: 5 }
    ],
    category: "digital",
    order: 1,
    isActive: true
  },
  {
    title: "Digitalisation Hôtelière",
    slug: "digitalisation-hoteliere",
    tagline: "Optimisez la gestion de vos établissements",
    description: "Solution complète pour la gestion hôtelière et les demandes de réservation en ligne.",
    heroText: "Centralisez vos opérations hôtelières et améliorez l'expérience client.",
    icon: "Hotel",
    coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop",
    features: [
      { title: "Gestion des chambres", description: "Suivi en temps réel", icon: "Hotel" },
      { title: "Réservations en ligne", description: "Système de booking intégré", icon: "CalendarCheck" },
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
    name: "Hôtel Sofia Palace",
    slug: "hotel-sofia-palace",
    description: "Hôtel 4 étoiles au cœur de Douala, offrant un mélange parfait de luxe et de technologie.",
    shortDescription: "Hôtel 4* high-tech à Douala",
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
        description: "Chambre confortable avec lit double, salle de bain privée et wifi gratuit.",
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
        name: "Suite Exécutive",
        description: "Suite spacieuse avec salon séparé, vue sur la ville et services premium.",
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
      cancellation: "Annulation gratuite jusqu'à 48h avant l'arrivée",
      children: "Enfants de moins de 12 ans gratuits",
      pets: "Animaux non acceptés"
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
      logger.info('📊 Connexion à la base de données établie');
    }

    // Supprime les données existantes
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Service.deleteMany({}),
      Hotel.deleteMany({})
    ]);
    logger.info('🗑️  Anciennes données supprimées');

    // ✅ User.create() déclenche pre('save') → hash automatique du password
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    logger.info(`👥 ${createdUsers.length} utilisateurs créés`);

    // ✅ Books — insertMany OK (pas de slug unique requis)
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const booksWithCreator = sampleBooks.map(book => ({ ...book, createdBy: adminUser._id }));
    const createdBooks = await Book.insertMany(booksWithCreator);
    logger.info(`📚 ${createdBooks.length} livres créés`);

    // ✅ Services — slugs explicites dans les données → insertMany OK
    const createdServices = await Service.insertMany(sampleServices);
    logger.info(`🛠️  ${createdServices.length} services créés`);

    // ✅ Hotels — slug explicite dans les données → insertMany OK
    const managerUser = createdUsers.find(u => u.role === 'hotel_manager');
    const hotelsWithManager = sampleHotels.map(hotel => ({ ...hotel, manager: managerUser._id }));
    const createdHotels = await Hotel.insertMany(hotelsWithManager);
    logger.info(`🏨 ${createdHotels.length} hôtels créés`);

    logger.info('✅ Base de données peuplée avec succès');

    console.log('\n📋 CRÉDENTIALS DE TEST:');
    console.log('=====================');
    sampleUsers.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
    });

    // Exit seulement si lancé directement via CLI
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