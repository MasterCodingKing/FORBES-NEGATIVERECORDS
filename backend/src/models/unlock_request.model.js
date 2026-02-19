const { DataTypes, Model } = require("sequelize");

class UnlockRequest extends Model {
  static initModel(sequelize) {
    UnlockRequest.init(
      {
        requestedBy: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        recordId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM("pending", "approved", "denied"),
          allowNull: false,
          defaultValue: "pending"
        },
        reviewedBy: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: "UnlockRequest",
        tableName: "unlock_requests",
        timestamps: true,
        indexes: [
          { fields: ["requestedBy"] },
          { fields: ["status"] }
        ]
      }
    );
  }
}

module.exports = UnlockRequest;
