const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const bcrypt = require("bcryptjs");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const listPending = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = { isApproved: 0 };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true } },
          client: { select: { id: true, clientCode: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    // Remove passwordHash from response
    const sanitized = data.map(({ passwordHash, ...rest }) => rest);

    return res.json({
      data: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true } },
          client: { select: { id: true, clientCode: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const sanitized = data.map(({ passwordHash, ...rest }) => rest);

    return res.json({
      data: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
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
      areaHeadManager, areaHeadManagerContact, position, department,
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

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username || null,
        email,
        passwordHash,
        roleId,
        clientId: clientId || null,
        branchId: branchId || null,
        isApproved: 1,
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        telephone: telephone || null,
        mobileNumber: mobileNumber || null,
        faxNumber: faxNumber || null,
        primaryEmail: primaryEmail || email,
        alternateEmail1: alternateEmail1 || null,
        alternateEmail2: alternateEmail2 || null,
        areaHeadManager: areaHeadManager || null,
        areaHeadManagerContact: areaHeadManagerContact || null,
        position: position || null,
        department: department || null,
      },
    });

    await logAudit(req, "USER_CREATE", "users", user.id);
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const approve = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { roleId, clientId, branchId } = req.body;
    const updates = { isApproved: 1 };
    if (roleId) updates.roleId = roleId;
    if (clientId) updates.clientId = clientId;
    if (branchId) updates.branchId = branchId;

    await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    await logAudit(req, "USER_APPROVE", "users", user.id);
    return res.json({ message: "User approved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields = [
      "username", "email", "roleId", "clientId", "branchId", "isApproved",
      "firstName", "middleName", "lastName",
      "telephone", "mobileNumber", "faxNumber",
      "primaryEmail", "alternateEmail1", "alternateEmail2",
      "areaHeadManager", "areaHeadManagerContact", "position", "department",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (req.body.password) {
      updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await logAudit(req, "USER_UPDATE", "users", user.id);
    return res.json({ message: "User updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit(req, "USER_DELETE", "users", id);
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: { select: { id: true, name: true } },
        client: { select: { id: true, clientCode: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { passwordHash, ...profile } = user;
    // Add virtual fullName
    profile.fullName = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ") || user.email;

    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedFields = [
      "firstName", "middleName", "lastName", "email",
      "telephone", "mobileNumber", "faxNumber",
      "primaryEmail", "alternateEmail1", "alternateEmail2",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await logAudit(req, "PROFILE_UPDATE", "users", user.id);

    const fullName = [updated.firstName, updated.middleName, updated.lastName]
      .filter(Boolean)
      .join(" ") || updated.email;

    return res.json({ id: updated.id, email: updated.email, fullName });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
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

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    await logAudit(req, "PASSWORD_CHANGE", "users", user.id);

    return res.json({ message: "Password changed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: "asc" },
    });
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
  listRoles,
};
