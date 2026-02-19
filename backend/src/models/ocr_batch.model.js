const { DataTypes, Model } = require("sequelize");

class OcrBatch extends Model {
  static initModel(sequelize) {
    OcrBatch.init(
      {
        fileName: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        filePath: {
          type: DataTypes.STRING(500),
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
          allowNull: false,
          defaultValue: "pending"
        },
        totalRecords: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        uploadedBy: {
          type: DataTypes.INTEGER,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: "OcrBatch",
        tableName: "ocr_batches",
        timestamps: true
      }
    );
  }
}

module.exports = OcrBatch;
