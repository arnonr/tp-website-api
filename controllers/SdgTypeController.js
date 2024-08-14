const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const methods = {
  async onGetAll(req, res) {
    try {
      const item = await prisma.sdg_type.findMany();

      res.status(200).json({
        data: item,
      });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },

  async onGetById(req, res) {
    try {
      const item = await prisma.sdg_type.findUnique({
        where: {
          id: Number(req.params.id),
        },
      });
      res.status(200).json({
        data: item,
      });
    } catch (error) {
      res.status(404).json({ msg: error.message });
    }
  },
};

module.exports = { ...methods };
