const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define roles and permissions
const roles = {
    STUDENT: 'STUDENT',
    MENTOR: 'MENTOR',
    IA: 'IA',
    LEADERSHIP: 'LEADERSHIP',
    ADMIN: 'ADMIN',
    EC: 'EC',
    TEACHER: 'TEACHER',
};

const statuses = {
    ACTIVE: 'ACTIVE',
    ALUMNI: 'ALUMNI',
    DEACTIVE: 'DEACTIVE',
    PENDING: 'PENDING',
    BANNED: 'BANNED',
};

const permissions = {
    CREATE_MEETING: 'create_meeting',
    EDIT_MEETING: 'edit_meeting',
    DELETE_MEETING: 'delete_meeting',
    VIEW_MEETING: 'view_meeting',
    MANAGE_USERS: 'manage_users',
};

// Role-permission mapping
const rolePermissions = {
    [roles.ADMIN]: Object.values(permissions),
    [roles.LEADERSHIP]: [permissions.CREATE_MEETING, permissions.VIEW_MEETING],
    [roles.MENTOR]: [permissions.CREATE_MEETING, permissions.VIEW_MEETING, permissions.EDIT_MEETING],
    [roles.STUDENT]: [permissions.VIEW_MEETING],
    [roles.TEACHER]: [permissions.CREATE_MEETING, permissions.VIEW_MEETING],
};

// User schema definition
// In your current user.model.js (snippet)
const userSchema = new mongoose.Schema(
    {
        user_id: { type: String, unique: true },
        student_code: { type: String, unique: true, sparse: true },
        email: { type: String, unique: true, required: true },
        name: { type: String, required: true },
        roles: { type: [String], enum: Object.values(roles), default: [roles.STUDENT] },
        courses: { // NEW FIELD for students
            type: [String],
            default: [],
            // Example: ['WEB', 'RCT305FSD']
        },
        status: { type: String, enum: Object.values(statuses), default: statuses.PENDING },
        isVerified: { type: Boolean, default: false },
        password: { type: String, required: true },
        permissions: { type: [String], enum: Object.values(permissions), default: [] },
        labels: { type: [String], default: [] },
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null },
    },
    { timestamps: true }
);

// Password hashing middleware
userSchema.pre('save', async function (next) {
    try {
        if (!this.user_id) {
            this.user_id = new mongoose.Types.ObjectId().toString();
        }

        if (this.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }

        if (this.isModified('roles')) {
            // Combine permissions for all roles
            const allPermissions = new Set();
            this.roles.forEach(role => {
                (rolePermissions[role] || []).forEach(permission => allPermissions.add(permission));
            });
            this.permissions = Array.from(allPermissions);
        }

        next();
    } catch (err) {
        next(err);
    }
});

// Methods
userSchema.methods.isValidPassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};

userSchema.methods.hasPermission = function (permission) {
    return this.permissions.includes(permission);
};

// Check if user has a specific label
userSchema.methods.hasLabel = function (label) {
    return this.labels.includes(label);
};

module.exports = mongoose.model('User', userSchema);
module.exports.roles = roles;
module.exports.statuses = statuses;
module.exports.permissions = permissions;
module.exports.rolePermissions = rolePermissions;