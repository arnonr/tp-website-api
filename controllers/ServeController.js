const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");

const prisma = new PrismaClient().$extends({
    result: {
        serve: {
            serve_file: {
                needs: { serve_file: true },
                compute(serve) {
                    let serve_file = null;
                    if (serve.serve_file != null) {
                        serve_file = process.env.PATH_UPLOAD + serve.serve_file;
                    }
                    return serve_file;
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

    if (req.query.lang && req.query.lang == "en") {
        $where["title_en"] = {
            not: null,
            not: "",
        };
    }

    if (req.query.title_th) {
        $where["title_th"] = {
            contains: req.query.title_th,
            //   mode: "insensitive",
        };
    }

    if (req.query.title_en) {
        $where["title_en"] = {
            contains: req.query.title_en,
            //   mode: "insensitive",
        };
    }

    if (req.query.text_all) {
        $where = {
            ...$where,
            OR: [
                {
                    title_th: {
                        contains: req.query.text_all,
                    },
                },

                {
                    title_en: {
                        contains: req.query.text_all,
                    },
                },
                {
                    detail_th: {
                        contains: req.query.text_all,
                    },
                },
                {
                    detail_en: {
                        contains: req.query.text_all,
                    },
                },
            ],
        };
    }

    if (req.query.title) {
        if (req.query.lang && req.query.lang == "th") {
            $where["title_th"] = {
                contains: req.query.title,
            };
        } else {
            $where["title_en"]["contains"] = req.query.title;
        }
    }

    if (req.query.department_id) {
        $where["department_id"] = parseInt(req.query.department_id);
    }

    if (req.query.service_category_id) {
        $where["service_category_id"] = parseInt(req.query.service_category_id);
    }

    if (req.query.is_publish) {
        $where["is_publish"] = parseInt(req.query.is_publish);
    }

    if (req.query.created_year) {
        $where["created_serve"] = {
            gte: new Date(
                req.query.created_year + "-01-01 00:00:00"
            ).toISOString(),
            lte: new Date(
                req.query.created_year + "-12-31 23:59:00"
            ).toISOString(),
        };
    }

    if (req.query.created_month) {
        $where["created_serve"] = {
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

    if (req.query.created_serve) {
        $where["created_serve"] = {
            gte: new Date(req.query.created_serve + " 00:00:00").toISOString(),
            lte: new Date(req.query.created_serve + " 23:59:00").toISOString(),
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
        $orderBy = [{ created_serve: "desc" }, { created_at: "desc" }];
    }

    //Count
    let $count = await prisma.serve.findMany({
        where: $where,
    });

    $count = $count.length;
    let $perPage = req.query.perPage ? Number(req.query.perPage) : 100;
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
    title_th: true,
    title_en: true,
    serve_file: true,
    department_id: true,
    service_category_id: true,
    detail_th: true,
    detail_en: true,
    rates_th: true,
    rates_en: true,
    location_th: true,
    location_en: true,
    contact_th: true,
    contact_en: true,
    is_publish: true,
    count_views: true,
    created_serve: true,
    title: true,
    detail: true,
    department: {
        select: {
            name_th: true,
            name_en: true,
            name: true,
        },
    },

    service_category: {
        select: {
            id: true,
            name_th: true,
        },
    },
};

// ปรับ Language
const checkLanguage = (req) => {
    let prismaLang = prisma.$extends({
        result: {
            serve: {
                title: {
                    needs: { title_th: true },
                    compute(serve) {
                        return req.query.lang && req.query.lang == "en"
                            ? serve.title_en
                            : serve.title_th;
                    },
                },
                detail: {
                    needs: { detail_th: true },
                    compute(serve) {
                        return req.query.lang && req.query.lang == "en"
                            ? serve.detail_en
                            : serve.detail_th;
                    },
                },
            },
            department: {
                name: {
                    needs: { name_th: true },
                    compute(department) {
                        return req.query.lang && req.query.lang == "en"
                            ? department.name_en
                            : department.name_th;
                    },
                },
            },
        },
    });

    return prismaLang;
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

            let prismaLang = checkLanguage(req);

            const item = await prismaLang.serve.findMany({
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
            let prismaLang = checkLanguage(req);
            const item = await prismaLang.serve.findUnique({
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
                "/images/serve/",
                "serve_file",
                500,
                350
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }

            const item = await prisma.serve.create({
                data: {
                    department_id: Number(req.body.department_id),
                    title_th: req.body.title_th,
                    title_en: req.body.title_en,
                    serve_file: pathFile,
                    detail_th: cutFroala(req.body.detail_th),
                    detail_en: cutFroala(req.body.detail_en),
                    rates_th: cutFroala(req.body.rates_th),
                    rates_en: cutFroala(req.body.rates_en),
                    location_th: cutFroala(req.body.location_th),
                    location_en: cutFroala(req.body.location_en),
                    contact_th: cutFroala(req.body.contact_th),
                    contact_en: cutFroala(req.body.contact_en),
                    is_publish: Number(req.body.is_publish),
                    created_serve: new Date(req.body.created_serve),
                    created_by: "arnonr",
                    updated_by: "arnonr",
                    service_category_id: Number(req.body.service_category_id),
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
                "/images/serve/",
                "serve_file",
                500,
                350
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }

            const item = await prisma.serve.update({
                where: {
                    id: Number(req.params.id),
                },
                data: {
                    title_th:
                        req.body.title_th != null
                            ? req.body.title_th
                            : undefined,
                    title_en:
                        req.body.title_en != null
                            ? req.body.title_en
                            : undefined,
                    department_id:
                        req.body.department_id != null
                            ? Number(req.body.department_id)
                            : undefined,
                    detail_th: cutFroala(req.body.detail_th),
                    detail_en: cutFroala(req.body.detail_en),
                    rates_th: cutFroala(req.body.rates_th),
                    rates_en: cutFroala(req.body.rates_en),
                    location_th: cutFroala(req.body.location_th),
                    location_en: cutFroala(req.body.location_en),
                    contact_th: cutFroala(req.body.contact_th),
                    contact_en: cutFroala(req.body.contact_en),
                    serve_file: pathFile != null ? pathFile : undefined,
                    is_publish:
                        req.body.is_publish != null
                            ? Number(req.body.is_publish)
                            : undefined,
                    created_serve:
                        req.body.created_serve != null
                            ? new Date(req.body.created_serve)
                            : undefined,
                    updated_by: "arnonr",
                    service_category_id:
                        req.body.service_category_id != null
                            ? Number(req.body.service_category_id)
                            : undefined,
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
            await prisma.serve.update({
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
};

module.exports = { ...methods };
