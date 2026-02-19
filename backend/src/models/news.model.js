const { DataTypes, Model } = require("sequelize");

class News extends Model {
  static initModel(sequelize) {
    News.init(
      {
        title: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        imageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: "News",
        tableName: "news",
        timestamps: true
      }
    );
  }
}

module.exports = News;
