const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");

// select แบบพิเศษ
const prisma = new PrismaClient().$extends({
  result: {
    annouce: {
      annouce_file: {
        needs: { annouce_file: true },
        compute(annouce) {
          let annouce_file = null;
          if (annouce.annouce_file != null) {
            annouce_file = process.env.PATH_UPLOAD + annouce.annouce_file;
          }
          return annouce_file;
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

  if (req.query.title) {
    $where["title"] = {
      contains: req.query.title,
    };
  }

  if (req.query.is_publish) {
    $where["is_publish"] = parseInt(req.query.is_publish);
  }

  if (req.query.created_year) {
    $where["created_annouce"] = {
      gte: new Date(req.query.created_year + "-01-01 00:00:00").toISOString(),
      lte: new Date(req.query.created_year + "-12-31 23:59:00").toISOString(),
    };
  }

  if (req.query.created_month) {
    $where["created_annouce"] = {
      gte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-01 00:00:00"
      ).toISOString(),
      lte: new Date(
        req.query.created_year + "-" + req.query.created_month + "-31 23:59:00"
      ).toISOString(),
    };
  }

  if (req.query.created_annouce) {
    $where["created_annouce"] = {
      gte: new Date(req.query.created_annouce + " 00:00:00").toISOString(),
      lte: new Date(req.query.created_annouce + " 23:59:00").toISOString(),
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
    $orderBy = { created_at: "desc" };
  }

  //Count
  let $count = await prisma.annouce.findMany({
    select: selectField,
    where: $where,
  });

  $count = $count.length;
  let $perPage = req.query.perPage ? Number(req.query.perPage) : 10;
  let $currentPage = req.query.currentPage ? Number(req.query.currentPage) : 1;
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
  annouce_file: true,
  is_publish: true,
  count_views: true,
  created_annouce: true,
};

const methods = {
  // ค้นหาทั้งหมด
  async onGetAll(req, res) {
    try {
      let $where = filterData(req);
      let other = await countDataAndOrder(req, $where);

      const item = await prisma.annouce.findMany({
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
      });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },
  // ค้นหาเรคคอร์ดเดียว
  async onGetById(req, res) {
    try {
      const item = await prisma.annouce.findUnique({
        select: selectField,
        where: {
          id: Number(req.params.id),
        },
      });
      res.status(200).json({ data: item });
    } catch (error) {
      res.status(404).json({ msg: error.message });
    }
  },

  // สร้าง
  async onCreate(req, res) {
    try {
      let pathFile = await uploadController.onUploadFile(
        req,
        "/document/annouce/",
        "annouce_file"
      );

      if (pathFile == "error") {
        return res.status(500).send("error");
      }

      const item = await prisma.annouce.create({
        data: {
          title: req.body.title,
          annouce_file: pathFile,
          is_publish: Number(req.body.is_publish),
          created_annouce: new Date(req.body.created_annouce),
          created_by: "arnonr",
          updated_by: "arnonr",
        },
      });
      res.status(201).json({...item,msg: 'success'});
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },

  // แก้ไข
  async onUpdate(req, res) {
    try {
      let pathFile = await uploadController.onUploadFile(
        req,
        "/document/annouce/",
        "annouce_file"
      );

      if (pathFile == "error") {
        return res.status(500).send("error");
      }

      const item = await prisma.annouce.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          title: req.body.title != null ? req.body.title : undefined,
          annouce_file: pathFile != null ? pathFile : undefined,
          is_publish:
            req.body.is_publish != null
              ? Number(req.body.is_publish)
              : undefined,
          created_annouce:
            req.body.created_annouce != null
              ? new Date(req.body.created_annouce)
              : undefined,
          updated_by: "arnonr",
        },
      });

      res.status(200).json({...item,msg: 'success'});
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  },
  // ลบ
  async onDelete(req, res) {
    try {
      const item = await prisma.annouce.update({
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
