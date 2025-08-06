const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");

const prisma = new PrismaClient().$extends({
    result: {
        sdg: {
            sdg_file: {
                needs: { sdg_file: true },
                compute(sdg) {
                    let sdg_file = null;
                    if (sdg.sdg_file != null) {
                        sdg_file = process.env.PATH_UPLOAD + sdg.sdg_file;
                    }
                    return sdg_file;
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

    if (req.query.title) {
        if (req.query.lang && req.query.lang == "th") {
            $where["title_th"] = {
                contains: req.query.title,
            };
        } else {
            $where["title_th"] = {
                contains: req.query.title,
            };
        }
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
        $orderBy = [{ created_sdg: "asc" }, { created_at: "asc" }];
    }

    //Count
    let $count = await prisma.sdg.findMany({
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
    title_th: true,
    title_en: true,
    detail_th: true,
    detail_en: true,
    color: true,
    sdg_file: true,
    is_publish: true,
    created_sdg: true,
};

// ปรับ Language
const checkLanguage = (req) => {
    let prismaLang = prisma.$extends({
        result: {
            sdg: {
                title: {
                    needs: { title_th: true },
                    compute(sdg) {
                        return req.query.lang && req.query.lang == "en"
                            ? sdg.title_en
                            : sdg.title_th;
                    },
                },
                detail: {
                    needs: { detail_th: true },
                    compute(sdg) {
                        return req.query.lang && req.query.lang == "en"
                            ? sdg.detail_en
                            : sdg.detail_th;
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

            const item = await prismaLang.sdg.findMany({
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
            const item = await prismaLang.sdg.findUnique({
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
                "/images/sdg/",
                "sdg_file",
                600,
                400
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }
            
            const item = await prisma.sdg.create({
                data: {
                    title_th: req.body.title_th,
                    title_en: req.body.title_en,
                    detail_th: cutFroala(req.body.detail_th),
                    detail_en: cutFroala(req.body.detail_en),
                    sdg_file: pathFile,
                    color: req.body.color,
                    is_publish: Number(req.body.is_publish),
                    created_sdg: new Date(req.body.created_sdg),
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
                "/images/sdg/",
                "sdg_file",
                600,
                400
            );

            if (pathFile == "error") {
                return res.status(500).send("error");
            }


            const item = await prisma.sdg.update({
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
                    detail_th: cutFroala(req.body.detail_th),
                    detail_en: cutFroala(req.body.detail_en),
                    sdg_file: pathFile != null ? pathFile : undefined,
                    is_publish:
                        req.body.is_publish != null
                            ? Number(req.body.is_publish)
                            : undefined,
                    created_sdg:
                        req.body.created_sdg != null
                            ? new Date(req.body.created_sdg)
                            : undefined,
                    updated_by: "arnonr",
                    color: req.body.color != null ? req.body.color : undefined,
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
            await prisma.sdg.update({
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
