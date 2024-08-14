const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");
const table = "team";

const prisma = new PrismaClient().$extends({
    result: {
        team: {
            team_file: {
                needs: { team_file: true },
                compute(team) {
                    let file = null;
                    if (team.team_file != null) {
                        file = process.env.PATH_UPLOAD + team.team_file;
                    }
                    return file;
                },
            },
        },
    },
});

// ค้นหา
const filterData = (req) => {
    let $where = {
        deleted_at: null,
    };

    if (req.query.id) {
        $where["id"] = parseInt(req.query.id);
    }

    if (req.query.prefix) {
        $where["prefix"] = {
            contains: req.query.prefix,
        };
    }

    if (req.query.firstname) {
        $where["firstname"] = {
            contains: req.query.firstname,
        };
    }

    if (req.query.surname) {
        $where["surname"] = {
            contains: req.query.surname,
        };
    }

    if (req.query.department_team_id) {
        $where["department_team_id"] = parseInt(req.query.department_team_id);
    }

    if (req.query.is_publish) {
        $where["is_publish"] = parseInt(req.query.is_publish);
    }

    return $where;
};

// หาจำนวนทั้งหมดและลำดับ
const countDataAndOrder = async (req, $where) => {
    //   Order
    let $orderBy = {};
    if (req.query.orderBy) {
        $orderBy[req.query.orderBy] = req.query.order;
    } else {
        $orderBy = { level: "asc" };
    }

    //Count
    let $count = await prisma.team.findMany({
        where: $where,
    });

    $count = $count.length;
    let $perPage = req.query.perPage ? Number(req.query.perPage) : 50;
    let $currentPage = req.query.currentPage
        ? Number(req.query.currentPage)
        : 1;
    let $totalPage =
        Math.ceil($count / $perPage) == 0 ? 1 : Math.ceil($count / $perPage);
    let $offset = $perPage * ($currentPage - 1);

    return {
        $orderBy: $orderBy,
        $offset: $offset,
        $perPage: $perPage,
        $count: $count,
        $totalPage: $totalPage,
        $currentPage: $currentPage,
    };
};

// ฟิลด์ที่ต้องการ Select รวมถึง join
const selectField = {
    id: true,
    prefix: true,
    firstname: true,
    surname: true,
    position: true,
    position_level: true,
    phone: true,
    email: true,
    level: true,
    department_team_id: true,
    team_file: true,
    is_publish: true,
    department_team: {
        select: {
            name: true,
        },
    },
};

const methods = {
    // ค้นหาทั้งหมด
    async onGetAll(req, res) {
        try {
            let $where = filterData(req);
            let other = await countDataAndOrder(req, $where);

            const item = await prisma.team.findMany({
                select: selectField,
                where: $where,
                orderBy: other.$orderBy,
                skip: other.$offset,
                take: other.$perPage,
            });

            res.status(200).json({
                data: item,
                totalData: other.$count,
                totalPage: other.$totalPage,
                currentPage: other.$currentPage,
                msg: "success",
            });
        } catch (error) {
            res.status(500).json({ msg: error.message });
        }
    },
    // ค้นหาเรคคอร์ดเดียว
    async onGetById(req, res) {
        try {
            const item = await prisma.team.findUnique({
                select: selectField,
                where: {
                    id: Number(req.params.id),
                },
            });
            res.status(200).json({ data: item, msg: " success" });
        } catch (error) {
            res.status(404).json({ msg: error.message });
        }
    },

    // สร้าง
    async onCreate(req, res) {
        try {
            let pathFile = await uploadController.onUploadFile(
                req,
                "/images/team/",
                "team_file"
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }

            const checkLevel = await prisma.team.findFirst({
                where: {
                    department_team_id: Number(req.body.department_team_id),
                },
                orderBy: {
                    level: "desc",
                },
            });

            let level = 1;
            if (checkLevel) {
                level = checkLevel.level + 1;
            }

            const item = await prisma.team.create({
                data: {
                    department_team_id: Number(req.body.department_team_id),
                    prefix: req.body.prefix,
                    firstname: req.body.firstname,
                    surname: req.body.surname,
                    position: req.body.position,
                    position_level: req.body.position_level,
                    phone: req.body.phone,
                    email: req.body.email,
                    level: level,
                    team_file: pathFile,
                    is_active: 1,
                    is_publish: Number(req.body.is_publish),
                    created_by: "arnonr",
                    updated_by: "arnonr",
                },
            });
            res.status(201).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    // แก้ไข
    async onUpdate(req, res) {
        try {
            let pathFile = await uploadController.onUploadFile(
                req,
                "/images/team/",
                "team_file"
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }

            const item = await prisma.team.update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    department_team_id:
                        req.body.department_team_id != null
                            ? Number(req.body.department_team_id)
                            : undefined,
                    prefix:
                        req.body.prefix != null ? req.body.prefix : undefined,
                    firstname:
                        req.body.firstname != null
                            ? req.body.firstname
                            : undefined,
                    surname:
                        req.body.surname != null ? req.body.surname : undefined,
                    position:
                        req.body.position != null
                            ? req.body.position
                            : undefined,
                    position_level:
                        req.body.position_level != null
                            ? req.body.position_level
                            : undefined,
                    phone: req.body.phone != null ? req.body.phone : undefined,
                    email: req.body.email != null ? req.body.email : undefined,
                    level: req.body.level != null ? Number(req.body.level) : undefined,
                    team_file: pathFile != null ? pathFile : undefined,
                    is_publish:
                        req.body.is_publish != null
                            ? Number(req.body.is_publish)
                            : undefined,
                    updated_by: "arnonr",
                },
            });

            res.status(200).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    // ลบ
    async onDelete(req, res) {
        try {
            await prisma.team.update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    deleted_at: new Date().toISOString(),
                },
            });

            res.status(200).json({
                msg: "success",
            });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    //   ChangeLevel
    async onChangeLevel(req, res) {
        try {
            const item = await prisma.team.findUnique({
                where: {
                    id: Number(req.params.id),
                },
            });

            let item1 = null;

            if (req.body.type == "up") {
                item1 = await prisma.team.findFirst({
                    where: {
                        level: item.level - 1,
                        department_team_id: item.department_team_id,
                    },
                });
            }

            if (req.body.type == "down") {
                item1 = await prisma.team.findFirst({
                    where: {
                        level: item.level + 1,
                        department_team_id: item.department_team_id,
                    },
                });
            }

            if (item1 != null) {
                let level = item1.level;
                let level1 = item.level;

                item.level = level;

                await prisma.team.update({
                    where: {
                        id: Number(req.params.id),
                    },
                    data: {
                        level: level,
                        updated_by: "arnonr",
                    },
                });

                await prisma.team.update({
                    where: {
                        id: item1.id,
                    },
                    data: {
                        level: level1,
                        updated_by: "arnonr",
                    },
                });
            }

            res.status(200).json({ msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },
};

module.exports = { ...methods };
