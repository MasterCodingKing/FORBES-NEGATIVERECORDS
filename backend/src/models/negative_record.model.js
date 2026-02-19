const { DataTypes, Model } = require("sequelize");

class NegativeRecord extends Model {
  static initModel(sequelize) {
    NegativeRecord.init(
      {
        type: {
          type: DataTypes.ENUM("Individual", "Company"),
          allowNull: false
        },
        firstName: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        middleName: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        lastName: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        companyName: {
          type: DataTypes.STRING(200),
          allowNull: true
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        source: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        ocrBatchId: {
          type: DataTypes.INTEGER,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: "NegativeRecord",
        tableName: "negative_records",
        timestamps: true,
        indexes: [
          { fields: ["lastName"] },
          { fields: ["companyName"] },
          { fields: ["type"] }
        ]
      }
    );
  }
}

module.exports = NegativeRecord;
