"use strict";
// DevAtlas Database Seed Script
// Created by Balaji Koneti
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create default organization
    const org = await prisma.org.upsert({
        where: { id: 'default-org' },
        update: {},
        create: {
            id: 'default-org',
            name: 'DevAtlas Default Organization',
        },
    });
    console.log('✅ Created organization:', org.name);
    // Create default users with different roles
    const users = [
        {
            email: 'owner@devatlas.local',
            name: 'Owner User',
            role: client_1.Role.OWNER,
        },
        {
            email: 'admin@devatlas.local',
            name: 'Admin User',
            role: client_1.Role.ADMIN,
        },
        {
            email: 'editor@devatlas.local',
            name: 'Editor User',
            role: client_1.Role.EDITOR,
        },
        {
            email: 'viewer@devatlas.local',
            name: 'Viewer User',
            role: client_1.Role.VIEWER,
        },
    ];
    for (const userData of users) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                orgId: org.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                provider: 'github',
            },
        });
        console.log(`✅ Created ${userData.role.toLowerCase()} user:`, user.email);
    }
    // Create sample project
    const project = await prisma.project.upsert({
        where: {
            orgId_handle: {
                orgId: org.id,
                handle: 'sample-user'
            }
        },
        update: {},
        create: {
            orgId: org.id,
            handle: 'sample-user',
            type: 'user',
            status: 'idle',
        },
    });
    console.log('✅ Created sample project:', project.handle);
    console.log('🎉 Database seeded successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map