const { DataTypes, Model } = require("sequelize");

class SubDomain extends Model {
  static initModel(sequelize) {
    SubDomain.init(
      {
        clientCode: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(150),
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM("Active", "Inactive"),
          allowNull: false,
          defaultValue: "Active"
        },
        isDeleted: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        deletedBy: {
          type: DataTypes.INTEGER,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: "SubDomain",
        tableName: "sub_domains",
        timestamps: true,
        indexes: [
          { fields: ["isDeleted"] },
          { fields: ["deletedAt"] },
          { fields: ["createdAt"] },
          { fields: ["clientId"] },
          { fields: ["status"] }
        ]
      }
    );
  }
}

module.exports = SubDomain;
