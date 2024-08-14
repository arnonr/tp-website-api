const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const table = "article";

// ค้นหา
const filterData = (req) => {
    let $where = {
        deleted_at: null,
    };

    if (req.query.id) {
        $where["id"] = parseInt(req.query.id);
    }

    if (req.query.title) {
        $where["title"] = {
            contains: req.query.title,
            //   mode: "insensitive",
        };
    }

    if (req.query.is_publish) {
        $where["is_publish"] = parseInt(req.query.is_publish);
    }

    if (req.query.created_year) {
        $where["created_article"] = {
            gte: new Date(
                req.query.created_year + "-01-01 00:00:00"
            ).toISOString(),
            lte: new Date(
                req.query.created_year + "-12-31 23:59:00"
            ).toISOString(),
        };
    }

    if (req.query.created_month) {
        $where["created_article"] = {
            gte: new Date(
                req.query.created_year +
                    "-" +
                    req.query.created_month +
                    "-01 00:00:00"
            ).toISOString(),
            lte: new Date(
                req.query.created_year +
                    "-" +
                    req.query.created_month +
                    "-31 23:59:00"
            ).toISOString(),
        };
    }

    if (req.query.created_article) {
        $where["created_article"] = {
            gte: new Date(req.query.created_article + " 00:00:00").toISOString(),
            lte: new Date(req.query.created_article + " 23:59:00").toISOString(),
        };
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
        $orderBy = { id: "asc" };
    }

    //Count
    let $count = await prisma[table].findMany({
        where: $where,
    });

    $count = $count.length;
    let $perPage = req.query.perPage ? Number(req.query.perPage) : 10;
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
    title: true,
    detail: true,
    is_publish: true,
    count_views: true,
    created_article: true,
    title: true,
    detail: true,
};

const cutFroala = (detail) => {
    let detail_success =
        detail != null
            ? detail
                  .replaceAll("Powered by", "")
                  .replaceAll(
                      '<p data-f-id="pbf" style="text-align: center; font-size: 14px; margin-top: 30px; opacity: 0.65; font-family: sans-serif;">',
                      ""
                  )
                  .replaceAll(
                      '<a href="https://www.froala.com/wysiwyg-editor?pb=1" title="Froala Editor">',
                      ""
                  )
                  .replaceAll("Froala Editor</a></p>", "")
            : undefined;
    return detail_success;
};

const methods = {
    // ค้นหาทั้งหมด
    async onGetAll(req, res) {
        try {
            let $where = filterData(req);
            let other = await countDataAndOrder(req, $where);

            const item = await prisma[table].findMany({
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
            const item = await prisma[table].findUnique({
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
            const item = await prisma[table].create({
                data: {
                    title: req.body.title,
                    detail: cutFroala(req.body.detail),
                    is_publish: Number(req.body.is_publish),
                    created_article: new Date(req.body.created_article),
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
            const item = await prisma[table].update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    title: req.body.title != null ? req.body.title : undefined,
                    detail: cutFroala(req.body.detail),
                    is_publish:
                        req.body.is_publish != null
                            ? Number(req.body.is_publish)
                            : undefined,
                    created_article:
                        req.body.created_article != null
                            ? new Date(req.body.created_article)
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
            const item = await prisma[table].update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    deleted_at: new Date().toISOString(),
                },
            });

            res.status(200).json(item);
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },
};

module.exports = { ...methods };
