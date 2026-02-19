const { DataTypes, Model } = require("sequelize");

class CreditTransaction extends Model {
  static initModel(sequelize) {
    CreditTransaction.init(
      {
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        type: {
          type: DataTypes.ENUM("topup", "deduction"),
          allowNull: false
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        performedBy: {
          type: DataTypes.INTEGER,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: "CreditTransaction",
        tableName: "credit_transactions",
        timestamps: true,
        indexes: [
          { fields: ["clientId"] }
        ]
      }
    );
  }
}

module.exports = CreditTransaction;
