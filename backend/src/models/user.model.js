const { DataTypes, Model } = require("sequelize");

class User extends Model {
  static initModel(sequelize) {
    User.init(
      {
        /* ── Login Information ── */
        username: {
          type: DataTypes.STRING(60),
          allowNull: true,
          unique: true
        },
        email: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: true
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        roleId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        branchId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "FK to sub_domains"
        },
        isApproved: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0
        },
        /* ── Personal Information ── */
        firstName: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        middleName: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        lastName: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        fullName: {
          type: DataTypes.VIRTUAL,
          get() {
            return [this.firstName, this.middleName, this.lastName]
              .filter(Boolean)
              .join(" ") || this.getDataValue("email");
          }
        },
        telephone: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        mobileNumber: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        faxNumber: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        primaryEmail: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        alternateEmail1: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        alternateEmail2: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        /* ── Employment Details ── */
        areaHeadManager: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        areaHeadManagerContact: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        position: {
          type: DataTypes.STRING(150),
          allowNull: true
        },
        department: {
          type: DataTypes.STRING(120),
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: "User",
        tableName: "users",
        timestamps: true,
        indexes: [
          { fields: ["clientId"] },
          { fields: ["branchId"] },
          { fields: ["roleId"] },
          { fields: ["isApproved"] }
        ]
      }
    );
  }
}

module.exports = User;
