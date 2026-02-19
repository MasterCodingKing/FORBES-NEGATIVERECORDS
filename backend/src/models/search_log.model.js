const { DataTypes, Model } = require("sequelize");

class SearchLog extends Model {
  static initModel(sequelize) {
    SearchLog.init(
      {
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        searchType: {
          type: DataTypes.ENUM("Individual", "Company"),
          allowNull: false
        },
        searchTerm: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        isBilled: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 1
        },
        fee: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        }
      },
      {
        sequelize,
        modelName: "SearchLog",
        tableName: "search_logs",
        timestamps: true,
        indexes: [
          { fields: ["clientId"] },
          { fields: ["userId"] },
          { fields: ["searchTerm"] },
          { fields: ["createdAt"] }
        ]
      }
    );
  }
}

module.exports = SearchLog;
