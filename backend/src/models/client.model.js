const { DataTypes, Model } = require("sequelize");

class Client extends Model {
  static initModel(sequelize) {
    Client.init(
      {
        clientCode: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true
        },
        name: {
          type: DataTypes.STRING(150),
          allowNull: false
        },
        clientGroup: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        /* ── Contact Information ── */
        website: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        street: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        barangay: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        city: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        province: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        postalCode: {
          type: DataTypes.STRING(20),
          allowNull: true
        },
        telephone: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        fax: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        mobile: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        /* ── Billing Information ── */
        billingType: {
          type: DataTypes.ENUM("Prepaid", "Postpaid"),
          allowNull: false,
          defaultValue: "Postpaid"
        },
        creditBalance: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        creditLimit: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: true,
          defaultValue: null,
          comment: "Only applies when billingType = Prepaid"
        },
        isActive: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 1
        }
      },
      {
        sequelize,
        modelName: "Client",
        tableName: "clients",
        timestamps: true,
        indexes: [
          { fields: ["clientCode"] },
          { fields: ["isActive"] },
          { fields: ["billingType"] }
        ]
      }
    );
  }
}

module.exports = Client;
