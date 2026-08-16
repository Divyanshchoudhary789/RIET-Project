/**
 * Database seeder — run once on initial setup.
 * Seeds: Chairperson account, all 5 campuses, all 8 departments.
 *
 * Usage: node src/seed/seed.js
 *
 * Set CHAIRPERSON_EMAIL and CHAIRPERSON_PASSWORD in .env before running.
 * After seeding, log in as Chairperson and change the password immediately.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../modules/users/user.model');
const Campus = require('../modules/campuses/campus.model');
const Department = require('../modules/departments/department.model');
const { ROLES, CAMPUSES, DEPARTMENTS } = require('../config/constants');

const BCRYPT_ROUNDS = 12;

const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding.');

    const chairpersonEmail = process.env.CHAIRPERSON_EMAIL;
    const chairpersonPassword = process.env.CHAIRPERSON_PASSWORD;

    if (!chairpersonEmail || !chairpersonPassword) {
      throw new Error(
        'CHAIRPERSON_EMAIL and CHAIRPERSON_PASSWORD must be set in .env to run the seeder.'
      );
    }

    const normalizedEmail = chairpersonEmail.toLowerCase().trim();

    // Check if a Chairperson account already exists (by role or by email)
    const existingChairperson = await User.findOne({
      $or: [{ role: ROLES.CHAIRPERSON }, { email: normalizedEmail }],
    });

    if (!existingChairperson) {
      const passwordHash = await bcrypt.hash(chairpersonPassword, BCRYPT_ROUNDS);

      // Use collection.insertOne to bypass Mongoose schema validation on scopeModel.
      // The Chairperson is an org-wide role — scopeModel is intentionally null,
      // but Mongoose's custom validator runs on schema.create() and could reject null
      // in edge cases. Direct collection insert is the safest approach here.
      await User.collection.insertOne({
        name: 'Chairperson',
        email: normalizedEmail,
        passwordHash,
        role: ROLES.CHAIRPERSON,
        scopeRef: null,
        scopeModel: null,
        isActive: true,
        mustChangePassword: false,
        createdBy: null,
        loginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshTokens: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Chairperson account created: ${normalizedEmail}`);
    } else {
      console.log(
        `Chairperson account already exists (${existingChairperson.email}). Skipping.`
      );
    }

    const chairperson = await User.findOne({ role: ROLES.CHAIRPERSON });

    if (!chairperson) {
      throw new Error('Chairperson account was not found after creation. Aborting.');
    }

    // Seed campuses
    for (const campusData of CAMPUSES) {
      const existing = await Campus.findOne({ code: campusData.code });
      if (!existing) {
        await Campus.create({
          name: campusData.name,
          code: campusData.code,
          isActive: true,
          createdBy: chairperson._id,
        });
        console.log(`Campus created: ${campusData.name} (${campusData.code})`);
      } else {
        console.log(`Campus already exists: ${campusData.name}. Skipping.`);
      }
    }

    // Seed departments
    for (const deptData of DEPARTMENTS) {
      const existing = await Department.findOne({ code: deptData.code });
      if (!existing) {
        await Department.create({
          name: deptData.name,
          code: deptData.code,
          isActive: true,
          createdBy: chairperson._id,
        });
        console.log(`Department created: ${deptData.name} (${deptData.code})`);
      } else {
        console.log(`Department already exists: ${deptData.name}. Skipping.`);
      }
    }

    console.log('\nSeeding completed successfully.');
    console.log('Next steps:');
    console.log(`  1. Log in as Chairperson: ${normalizedEmail}`);
    console.log('  2. Create a Director account via POST /api/users');
    console.log('  3. Director creates campuses, departments, and all other users');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

seed();
