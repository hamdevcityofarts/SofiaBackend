const Book = require('../models/Book.model');
const Order = require('../models/Order.model');
const User = require('../models/User.model');
const Hotel = require('../models/Hotel.model');
const logger = require('../utils/logger');

class StatsService {
  // Get general statistics
  async getGeneralStats() {
    try {
      const [
        totalUsers,
        totalBooks,
        totalOrders,
        totalHotels,
        todayOrders,
        todayRevenue,
        monthlyRevenue
      ] = await Promise.all([
        User.countDocuments(),
        Book.countDocuments({ status: 'active' }),
        Order.countDocuments(),
        Hotel.countDocuments({ isActive: true }),
        Order.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }),
        Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]),
        Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 30))
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);

      return {
        totalUsers,
        totalBooks,
        totalOrders,
        totalHotels,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      };

    } catch (error) {
      logger.error(`Erreur statistiques générales: ${error.message}`);
      throw error;
    }
  }

  // Get revenue statistics
  async getRevenueStats(days = 30) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);

      const revenueData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: date },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Format for charts
      const formattedData = revenueData.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        revenue: item.revenue,
        orders: item.orders
      }));

      return formattedData;

    } catch (error) {
      logger.error(`Erreur statistiques revenus: ${error.message}`);
      throw error;
    }
  }

  // Get book statistics
  async getBookStats() {
    try {
      const [
        byCategory,
        topSelling,
        lowStock
      ] = await Promise.all([
        Book.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Book.aggregate([
          { $match: { status: 'active' } },
          { $sort: { 'metadata.purchases': -1 } },
          { $limit: 10 },
          {
            $project: {
              title: 1,
              purchases: '$metadata.purchases',
              price: 1,
              coverImage: 1
            }
          }
        ]),
        Book.find({
          stock: { $lt: 10 },
          status: 'active'
        })
        .sort('stock')
        .limit(10)
        .select('title stock price')
      ]);

      return {
        byCategory,
        topSelling,
        lowStock
      };

    } catch (error) {
      logger.error(`Erreur statistiques livres: ${error.message}`);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats() {
    try {
      const [
        byRole,
        newUsers,
        activeUsers
      ] = await Promise.all([
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        User.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }),
        User.countDocuments({
          lastLogin: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        })
      ]);

      return {
        byRole,
        newUsers,
        activeUsers
      };

    } catch (error) {
      logger.error(`Erreur statistiques utilisateurs: ${error.message}`);
      throw error;
    }
  }

  // Get order statistics
  async getOrderStats() {
    try {
      const [
        byStatus,
        byPaymentMethod,
        averageOrderValue
      ] = await Promise.all([
        Order.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Order.aggregate([
          { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Order.aggregate([
          {
            $group: {
              _id: null,
              average: { $avg: '$totalAmount' },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);

      return {
        byStatus,
        byPaymentMethod,
        averageOrderValue: averageOrderValue[0] || { average: 0, totalOrders: 0, totalRevenue: 0 }
      };

    } catch (error) {
      logger.error(`Erreur statistiques commandes: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StatsService();