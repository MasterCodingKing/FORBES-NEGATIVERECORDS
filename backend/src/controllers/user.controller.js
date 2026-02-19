const { User, Role, Client, SubDomain } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const listPending = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      where: { isApproved: 0 },
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Client, attributes: ["id", "clientCode", "name"] },
        { model: SubDomain, as: "Branch", attributes: ["id", "name"] }
      ],
      attributes: { exclude: ["passwordHash"] },
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Client, attributes: ["id", "clientCode", "name"] },
        { model: SubDomain, as: "Branch", attributes: ["id", "name"] }
      ],
      attributes: { exclude: ["passwordHash"] },
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const {
      username, email, password, roleId, clientId, branchId,
      firstName, middleName, lastName,
      telephone, mobileNumber, faxNumber,
      primaryEmail, alternateEmail1, alternateEmail2,
      areaHeadManager, areaHeadManagerContact, position, department
    } = req.body;

    if (!email || !password || !roleId) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (username && username.length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username, email, passwordHash, roleId,
      clientId: clientId || null,
      branchId: branchId || null,
      isApproved: 1,
      firstName, middleName, lastName,
      telephone, mobileNumber, faxNumber,
      primaryEmail: primaryEmail || email,
      alternateEmail1, alternateEmail2,
      areaHeadManager, areaHeadManagerContact, position, department
    });

    await logAudit(req, "USER_CREATE", "users", user.id);
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const approve = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { roleId, clientId, branchId } = req.body;
    const updates = { isApproved: 1 };
    if (roleId) updates.roleId = roleId;
    if (clientId) updates.clientId = clientId;
    if (branchId) updates.branchId = branchId;

    await user.update(updates);
    await logAudit(req, "USER_APPROVE", "users", user.id);
    return res.json({ message: "User approved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields = [
      "username", "email", "roleId", "clientId", "branchId", "isApproved",
      "firstName", "middleName", "lastName",
      "telephone", "mobileNumber", "faxNumber",
      "primaryEmail", "alternateEmail1", "alternateEmail2",
      "areaHeadManager", "areaHeadManagerContact", "position", "department"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    }

    if (req.body.password) {
      user.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    await user.save();
    await logAudit(req, "USER_UPDATE", "users", user.id);
    return res.json({ message: "User updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await user.destroy();
    await logAudit(req, "USER_DELETE", "users", parseInt(req.params.id, 10));
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Client, attributes: ["id", "clientCode", "name"] },
        { model: SubDomain, as: "Branch", attributes: ["id", "name"] }
      ],
      attributes: { exclude: ["passwordHash"] }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields = [
      "firstName", "middleName", "lastName", "email",
      "telephone", "mobileNumber", "faxNumber",
      "primaryEmail", "alternateEmail1", "alternateEmail2"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    }

    await user.save();
    await logAudit(req, "PROFILE_UPDATE", "users", user.id);

    return res.json({ id: user.id, email: user.email, fullName: user.fullName });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords required" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await logAudit(req, "PASSWORD_CHANGE", "users", user.id);

    return res.json({ message: "Password changed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [["id", "ASC"]] });
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listPending,
  listAll,
  create,
  approve,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  changePassword,
  listRoles
};
