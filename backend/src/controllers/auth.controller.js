const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../models");
const { ROLES } = require("../utils/roles");

const register = async (req, res) => {
  try {
    const {
      email, password, username,
      fullName, firstName, middleName, lastName,
      telephone, mobileNumber, faxNumber,
      primaryEmail, alternateEmail1, alternateEmail2,
      areaHeadManager, areaHeadManagerContact, position, department,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    const role = await prisma.role.findFirst({ where: { name: ROLES.USER } });
    if (!role) {
      return res.status(500).json({ message: "Role configuration missing" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const fName = firstName || (fullName ? fullName.split(" ")[0] : "");
    const lName = lastName || (fullName ? fullName.split(" ").slice(1).join(" ") : "");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username: username || null,
        firstName: fName,
        middleName: middleName || null,
        lastName: lName,
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
        roleId: role.id,
        isApproved: 0,
      },
    });

    // Create in-app notification for all admins/super admins
    const fullNameComputed = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ") || user.email;

    const adminRoles = await prisma.role.findMany({
      where: { name: { in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] } },
    });
    const adminRoleIds = adminRoles.map((r) => r.id);

    const admins = await prisma.user.findMany({
      where: { roleId: { in: adminRoleIds }, isApproved: 1 },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "NEW_REGISTRATION",
          title: "New Registration",
          message: `${fullNameComputed} has registered and is awaiting approval.`,
          relatedId: user.id,
        })),
      });
    }

    return res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: fullNameComputed,
      isApproved: user.isApproved,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, client: true },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.role) {
      console.error(`User ${user.id} has no role assigned`);
      return res.status(500).json({ message: "User role not configured" });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: "Account not approved" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const fullName = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ") || user.email;

    // Ensure role is a trimmed, non-empty string
    const roleName = (user.role?.name || ROLES.USER).trim();

    const token = jwt.sign(
      {
        id: user.id,
        role: roleName,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email,
        fullName,
        clientName: user.client?.name || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  register,
  login,
};
