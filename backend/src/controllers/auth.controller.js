const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../models");
const { ROLES } = require("../utils/roles");

const register = async (req, res) => {
  try {
    const { email, password, fullName, firstName, middleName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
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
        firstName: fName,
        middleName: middleName || null,
        lastName: lName,
        roleId: role.id,
        isApproved: 0,
      },
    });

    const fullNameComputed = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ") || user.email;

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
      include: { role: true },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: "Account not approved" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role?.name || ROLES.USER },
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
