const { DataTypes, Model } = require("sequelize");

class Role extends Model {
  static initModel(sequelize) {
    Role.init(
      {
        name: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true
        }
      },
      {
        sequelize,
        modelName: "Role",
        tableName: "roles",
        timestamps: true
      }
    );
  }
}

module.exports = Role;
