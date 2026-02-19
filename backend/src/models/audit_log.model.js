const { DataTypes, Model } = require("sequelize");

class AuditLog extends Model {
  static initModel(sequelize) {
    AuditLog.init(
      {
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        action: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        module: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        recordId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: "AuditLog",
        tableName: "audit_logs",
        timestamps: true
      }
    );
  }
}

module.exports = AuditLog;
