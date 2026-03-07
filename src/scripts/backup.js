require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const connectDB = require('../config/database');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create MongoDB backup using mongodump
  async createMongoBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Get MongoDB URI from environment
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI non définie');
      }

      // Extract database name from URI
      const dbName = mongoUri.split('/').pop().split('?')[0];

      // Create mongodump command
      const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

      logger.info(`📦 Création de la sauvegarde: ${backupName}`);
      
      // Execute backup command
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && !stderr.includes('writing')) {
        throw new Error(`Erreur mongodump: ${stderr}`);
      }

      // Create metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        database: dbName,
        backupName,
        size: this.getDirectorySize(backupPath)
      };

      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info(`✅ Sauvegarde créée: ${backupName} (${metadata.size})`);

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        backupName,
        backupPath,
        metadata
      };

    } catch (error) {
      logger.error(`❌ Erreur création sauvegarde: ${error.message}`);
      throw error;
    }
  }

  // Restore MongoDB backup
  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Sauvegarde ${backupName} non trouvée`);
      }

      // Get MongoDB URI
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI non définie');
      }

      // Extract database name
      const dbName = mongoUri.split('/').pop().split('?')[0];

      // Create mongorestore command
      const command = `mongorestore --uri="${mongoUri}" --drop "${backupPath}/${dbName}"`;

      logger.info(`🔄 Restauration de la sauvegarde: ${backupName}`);
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && !stderr.includes('restoring')) {
        throw new Error(`Erreur mongorestore: ${stderr}`);
      }

      logger.info(`✅ Sauvegarde restaurée: ${backupName}`);

      return {
        success: true,
        backupName,
        database: dbName
      };

    } catch (error) {
      logger.error(`❌ Erreur restauration sauvegarde: ${error.message}`);
      throw error;
    }
  }

  // List all backups
  async listBackups() {
    try {
      const backups = [];
      
      if (!fs.existsSync(this.backupDir)) {
        return backups;
      }

      const items = fs.readdirSync(this.backupDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory() && item.name.startsWith('backup-')) {
          const backupPath = path.join(this.backupDir, item.name);
          const metadataPath = path.join(backupPath, 'metadata.json');
          
          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          } else {
            // Fallback for old backups without metadata
            const stats = fs.statSync(backupPath);
            metadata = {
              timestamp: item.name.replace('backup-', '').replace(/-/g, ':'),
              backupName: item.name,
              size: this.getDirectorySize(backupPath)
            };
          }
          
          backups.push(metadata);
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;

    } catch (error) {
      logger.error(`❌ Erreur liste sauvegardes: ${error.message}`);
      throw error;
    }
  }

  // Delete old backups
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= this.maxBackups) {
        return;
      }

      const backupsToDelete = backups.slice(this.maxBackups);
      
      for (const backup of backupsToDelete) {
        const backupPath = path.join(this.backupDir, backup.backupName);
        
        if (fs.existsSync(backupPath)) {
          fs.rmSync(backupPath, { recursive: true, force: true });
          logger.info(`🗑️  Sauvegarde supprimée: ${backup.backupName}`);
        }
      }

      logger.info(`🧹 ${backupsToDelete.length} anciennes sauvegardes supprimées`);

    } catch (error) {
      logger.error(`❌ Erreur nettoyage sauvegardes: ${error.message}`);
      throw error;
    }
  }

  // Get directory size
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const calculateSize = (currentPath) => {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        
        if (item.isDirectory()) {
          calculateSize(itemPath);
        } else if (item.isFile()) {
          totalSize += fs.statSync(itemPath).size;
        }
      }
    };

    if (fs.existsSync(dirPath)) {
      calculateSize(dirPath);
    }

    // Format size
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    } else if (totalSize < 1024 * 1024 * 1024) {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  // Export data to JSON (for manual backup)
  async exportToJson() {
    try {
      await connectDB();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(this.backupDir, `export-${timestamp}`);
      
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Import models dynamically
      const User = require('../models/User.model');
      const Book = require('../models/Book.model');
      const Order = require('../models/Order.model');
      const Hotel = require('../models/Hotel.model');
      const Service = require('../models/Service.model');

      // Export each collection
      const collections = [
        { name: 'users', model: User },
        { name: 'books', model: Book },
        { name: 'orders', model: Order },
        { name: 'hotels', model: Hotel },
        { name: 'services', model: Service }
      ];

      for (const collection of collections) {
        const data = await collection.model.find({}).lean();
        
        // Remove sensitive data from users
        if (collection.name === 'users') {
          data.forEach(user => {
            delete user.password;
            delete user.resetPasswordToken;
            delete user.resetPasswordExpire;
            delete user.verificationToken;
          });
        }

        const filePath = path.join(exportDir, `${collection.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        logger.info(`📄 ${collection.name}: ${data.length} documents exportés`);
      }

      // Create export metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        database: process.env.MONGODB_URI.split('/').pop().split('?')[0],
        exportType: 'json',
        collections: collections.map(c => c.name)
      };

      fs.writeFileSync(
        path.join(exportDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info(`✅ Export JSON terminé: ${exportDir}`);

      return {
        success: true,
        exportDir,
        metadata
      };

    } catch (error) {
      logger.error(`❌ Erreur export JSON: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const backupService = new BackupService();
  const command = process.argv[2];

  async function runCommand() {
    try {
      switch (command) {
        case 'create':
          await backupService.createMongoBackup();
          break;
          
        case 'list':
          const backups = await backupService.listBackups();
          console.log('\n📋 Liste des sauvegardes:');
          console.log('========================');
          backups.forEach((backup, index) => {
            console.log(`\n${index + 1}. ${backup.backupName}`);
            console.log(`   📅 ${backup.timestamp}`);
            console.log(`   📊 ${backup.size}`);
          });
          break;
          
        case 'export':
          await backupService.exportToJson();
          break;
          
        case 'cleanup':
          await backupService.cleanupOldBackups();
          break;
          
        default:
          console.log('Usage: node backup.js [create|list|export|cleanup]');
          console.log('\nCommands:');
          console.log('  create    - Create new MongoDB backup');
          console.log('  list      - List all backups');
          console.log('  export    - Export data to JSON');
          console.log('  cleanup   - Delete old backups');
          break;
      }
    } catch (error) {
      console.error(`❌ Erreur: ${error.message}`);
      process.exit(1);
    }
  }

  runCommand();
}

module.exports = BackupService;