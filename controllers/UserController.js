const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const uploadController = require("./UploadsController");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const algorithm = "aes-256-cbc"; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const saltRounds = 10;
// const { expressjwt: jwt1 } = require("express-jwt");

const prisma = new PrismaClient();

// ค้นหา
const filterData = (req) => {
    let $where = {
        deleted_at: null,
    };

    if (req.query.id) {
        $where["id"] = parseInt(req.query.id);
    }

    if (req.query.email) {
        $where["email"] = req.query.email;
    }

    if (req.query.secret_confirm_email) {
        $where["secret_confirm_email"] = req.query.secret_confirm_email;
    }

    if (req.query.status) {
        $where["status"] = parseInt(req.query.status);
    }

    if (req.query.group_id) {
        $where["group_id"] = parseInt(req.query.group_id);
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
        $orderBy = { created_at: "desc" };
    }

    //Count
    let $count = await prisma.user.findMany({
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
    group_id: true,
    email: true,
    username: true,
    name: true,
    department_id: true,
    status: true,
    status: true,
    is_publish: true,
    department: {
        select: {
            name_th: true,
        },
    },
};

//Encrypting text
const encrypt = (text) => {
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(text, salt);
    return hash;
};

const methods = {
    // ค้นหาทั้งหมด
    async onGetAll(req, res) {
        try {
            let $where = filterData(req);
            let other = await countDataAndOrder(req, $where);

            const item = await prisma.user.findMany({
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
            const item = await prisma.user.findUnique({
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
        let authUsername = null;
        if (req.headers.authorization !== undefined) {
            const decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            authUsername = decoded.username;
        }

        const count_active = await prisma.user.count({
            where: {
                username: req.body.username,
                deleted_at: null,
            },
        });

        if (count_active > 0) {
            return res.status(409).json({ msg: "Username already exists" });
        }

        const count_inactive = await prisma.user.count({
            where: {
                username: req.body.username,
                deleted_at: { not: null },
            },
        });

        try {
            let item;

            if (count_inactive > 0) {
                item = await prisma.user.update({
                    where: {
                        username: req.body.username,
                    },
                    data: {
                        name: req.body.name,
                        email: req.body.email,
                        tel: req.body.tel,
                        level: Number(req.body.level),
                        department_id: Number(req.body.department_id),
                        is_active: Number(req.body.is_active),
                        updated_by: authUsername,
                        deleted_at: null,
                    },
                });
            } else {
                item = await prisma.user.create({
                    data: {
                        username: req.body.username,
                        name: req.body.name,
                        email: req.body.email,
                        tel: req.body.tel,
                        level: Number(req.body.level),
                        department_id: Number(req.body.department_id),
                        // password: req.body.password,
                        is_active: Number(req.body.is_active),
                        created_by: authUsername,
                        updated_by: authUsername,
                    },
                });
            }

            res.status(201).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onCreateRegister(data) {
        const count_active = await prisma.user.count({
            where: {
                username: data.username,
                deleted_at: null,
            },
        });

        if (count_active > 0) {
            return res.status(409).json({ msg: "Username already exists" });
        }

        const count_inactive = await prisma.user.count({
            where: {
                username: data.username,
                deleted_at: { not: null },
            },
        });

        try {
            let item;

            if (count_inactive > 0) {
                item = await prisma.user.update({
                    where: {
                        username: data.username,
                    },
                    data: {
                        name: data.name,
                        email: data.email,
                        department_id: Number(data.department_id),
                        group_id: Number(data.group_id),
                        status: Number(data.status),
                        is_active: Number(data.is_active),
                        is_publish: Number(data.is_publish),
                        updated_by: data.username,
                        deleted_at: null,
                    },
                });
                console.log("FREEDOm1");
            } else {
                item = await prisma.user.create({
                    data: {
                        username: data.username,
                        name: data.name,
                        email: data.email,
                        department_id: Number(data.department_id),
                        group_id: Number(data.group_id),
                        status: Number(data.status),
                        is_active: Number(data.is_active),
                        is_publish: Number(data.is_publish),
                        created_by: data.username,
                        updated_by: data.username,
                    },
                });
            }
            return { ...item, msg: "success" };
        } catch (error) {
            console.log(error);
            return { msg: error };
        }
    },

    // แก้ไข
    async onUpdate(req, res) {
        let authUsername = null;
        if (req.headers.authorization !== undefined) {
            const decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            authUsername = decoded.username;
        }

        try {
            const item = await prisma.user.update({
                where: {
                    id: Number(req.params.id),
                },

                data: {
                    username:
                        req.body.username != null
                            ? req.body.username
                            : undefined,
                    name: req.body.name != null ? req.body.name : undefined,
                    email: req.body.email != null ? req.body.email : undefined,
                    tel: req.body.tel != null ? req.body.tel : undefined,
                    level:
                        req.body.level != null
                            ? Number(req.body.level)
                            : undefined,
                    department_id:
                        req.body.department_id != null
                            ? Number(req.body.department_id)
                            : undefined,
                    is_active:
                        req.body.is_active != null
                            ? Number(req.body.is_active)
                            : undefined,
                    updated_by: authUsername,
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
            const item = await prisma.user.update({
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

    async onLogin(req, res) {
        try {
            if (req.body.username == undefined) {
                throw new Error("Username is undefined");
            }

            if (req.body.password == undefined) {
                throw new Error("Password is undefined");
            }

            const item = await prisma.user.findUnique({
                select: { ...selectField },
                where: {
                    username: req.body.username,
                    deleted_at: null,
                },
            });

            if (item) {
                let login_success = false;

                if (item.status == 1) {
                    throw new Error("Wating Approve");
                }

                if (item.status == 3) {
                    throw new Error("User Blocked");
                }

                if (req.body.password == process.env.MASTER_PASSWORD) {
                    login_success = true;
                    // console.log('Login with master pasword');
                    item.login_method = "master_password";
                } else {
                    item.login_method = "icit_account";
                    // console.log('Login with ICIT Account API');

                    let api_config = {
                        method: "post",
                        url: "https://api.account.kmutnb.ac.th/api/account-api/user-authen",
                        headers: {
                            Authorization:
                                "Bearer " + process.env.ICIT_ACCOUNT_TOKEN,
                        },
                        data: {
                            username: req.body.username,
                            password: req.body.password,
                            scopes: "personel",
                        },
                    };

                    let response = await axios(api_config);

                    if (response.data.api_status_code == "202") {
                        login_success = true;
                    } else if (response.data.api_status == "fail") {
                        throw new Error(response.data.api_message);
                    } else {
                    }
                }

                if (login_success == true) {
                    const payload = item;
                    const secretKey = process.env.SECRET_KEY;

                    const token = jwt.sign(payload, secretKey, {
                        expiresIn: "90d",
                    });

                    res.status(200).json({ ...item, token: token });
                } else {
                    throw new Error("Invalid credential");
                }
            } else {
                throw new Error("Invalid credential");
            }
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onSearchIcitAccount(req, res) {
        let api_config = {
            method: "post",
            url: "https://api.account.kmutnb.ac.th/api/account-api/user-info",
            headers: {
                Authorization: "Bearer " + process.env.ICIT_ACCOUNT_TOKEN,
            },
            data: { username: req.body.username },
        };

        try {
            let response = await axios(api_config);
            if (response.data.api_status_code == "201") {
                // res.status(200).json(response.data.userInfo);
                return { ...response.data.userInfo, msg: "success" };
            } else if (response.data.api_status_code == "501") {
                // res.status(404).json({ msg: response.data.api_message });
                return { msg: response.data.api_message };
            } else {
                // res.status(200).json(response.data);
                return { ...response.data, msg: "error" };
            }
            // res.status(200);
        } catch (error) {
            // res.status(400).json({ msg: error.message });
            return { msg: error.message };
        }
    },

    async onRegister(req, res) {
        try {
            const checkItem = await prisma.user.findFirst({
                where: {
                    username: req.body.username,
                },
            });

            if (checkItem) {
                throw new Error("username is duplicate");
            }
            let checkICITAccount = await methods.onSearchIcitAccount(req);

            if (checkICITAccount.msg == "success") {
                const item = await methods.onCreateRegister({
                    ...checkICITAccount,
                    department_id: req.body.department_id,
                    email: req.body.email,
                    name: checkICITAccount.displayname,
                    status: 1,
                    is_active: 1,
                    is_publish: 1,
                    group_id: 2,
                });

                if (item.msg == "success") {
                    res.status(201).json({ ...item });
                } else {
                    throw new Error(item.msg);
                }
            } else {
                throw new Error(checkICITAccount.msg);
            }

            // let transporter = nodemailer.createTransport({
            //     host: "smtp.gmail.com",
            //     port: 587,
            //     secure: false,
            //     auth: {
            //         user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
            //         pass: "sicckmutnb78", // email password
            //     },
            // });

            // let confirm_url =
            //     process.env.PATH_CLIENT +
            //     "confirm-email?id=" +
            //     item.id +
            //     "&email=" +
            //     item.email +
            //     "&secret_confirm_email=" +
            //     item.secret_confirm_email;

            //     await transporter.sendMail({
            //         from: "ระบบงาน", // อีเมลผู้ส่ง
            //         to: item.email, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
            //         subject:
            //             "ยืนยันการสมัครสมาชิกกับศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง", // หัวข้ออีเมล

            //         html: `<div
            //   style="
            //     font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
            //     border-style: solid;
            //     border-width: thin;
            //     border-color: #dadce0;
            //     border-radius: 8px;
            //     padding: 40px 20px;
            //   "
            // >
            //   <div style="margin-bottom: 22px">
            //     <img
            //       src="http://sci.kmutnb.ac.th/sicc/_nuxt/logo-sicc.5cf857a5.png"
            //       alt=""
            //       style="width: 160px"
            //       class="CToWUd"
            //       data-bit="iit"
            //     />
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">
            //     ยืนยันการสมัครสมาชิกกับศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง<br />(Scientific
            //     Instrument and Height Performance Computer Center: SICC)
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">
            //     ขอบคุณสำหรับการสมัครสมาชิกกับเว็บไซต์
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">
            //     <div
            //       style="
            //         font-size: 20px;
            //         margin-bottom: 22px;
            //         border-width: 1px;
            //         border-style: solid;
            //         padding: 1em;
            //         width: 300px;
            //         border-color: #ffcb05;
            //       "
            //     >
            //       <a href="http://sci.kmutnb.ac.th/sicc/">sicc.sci.kmutnb.ac.th</a>
            //     </div>
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">
            //     กรุณาคลิกที่ลิงค์ เพื่อยืนยันการเป็นสมาชิก
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">ลิงค์สำหรับ ยืนยัน</div>
            //   <div
            //     style="
            //       font-size: 20px;
            //       margin-bottom: 22px;
            //       border-width: 1px;
            //     "
            //   >
            //     <a
            //       href="${confirm_url}"
            //       style="
            //         font-family: 'Google Sans', Roboto, RobotoDraft, Helvetica, Arial,
            //           sans-serif;
            //         line-height: 16px;
            //         color: #ffffff;
            //         font-weight: 400;
            //         text-decoration: none;
            //         font-size: 14px;
            //         display: inline-block;
            //         padding: 10px 24px;
            //         background-color: #4184f3;
            //         border-radius: 5px;
            //         min-width: 40px;
            //       "
            //       target="_blank"
            //       >ยืนยัน</a
            //     >
            //   </div>
            //   <div style="font-size: 20px; margin-bottom: 22px">อีเมล : ${item.email}</div>

            //   <div style="border-top: 1px solid #dadce0; margin: 20px 0 10px 0"></div>
            // </div>
            // `,
            //     });

            // res.status(201).json({ ...item, ...profile, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onConfirmEmail(req, res) {
        try {
            const item = await prisma.user.findFirst({
                where: {
                    id: Number(req.body.id),
                    email: req.body.email,
                    secret_confirm_email: req.body.secret_confirm_email,
                },
            });

            if (item) {
                await prisma.user.update({
                    where: {
                        id: item.id,
                    },
                    data: {
                        status: 2,
                    },
                });
            } else {
                throw new Error("Key is Wrong");
            }

            res.status(201).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onResendConfirmEmail(req, res) {
        try {
            const item = await prisma.user.findFirst({
                where: {
                    email: req.body.email,
                },
            });

            if (!item) {
                throw new Error("Email Not Found");
            }

            let itemUpdate = await prisma.user.update({
                where: {
                    id: item.id,
                },
                data: {
                    secret_confirm_email: crypto
                        .randomBytes(20)
                        .toString("hex"),
                },
            });

            let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    // ข้อมูลการเข้าสู่ระบบ
                    user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
                    pass: "sicckmutnb78", // email password
                },
            });

            await transporter.sendMail({
                from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
                to: itemUpdate.email, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
                subject:
                    "ยืนยันการสมัครสมาชิก ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // หัวข้ออีเมล
                html:
                    "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดยืนยันการสมัครสมาชิก : <a href='" +
                    process.env.PATH_CLIENT +
                    "confirm-email?id=" +
                    itemUpdate.id +
                    "&email=" +
                    itemUpdate.email +
                    "&secret_confirm_email=" +
                    itemUpdate.secret_confirm_email +
                    "'>คลิก</a>", // html body
            });

            res.status(201).json({
                ...item,
                msg: "success",
                password: undefined,
            });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onResendResetPassword(req, res) {
        try {
            const item = await prisma.user.findFirst({
                where: {
                    email: req.body.email,
                },
            });

            if (!item) {
                throw new Error("Email Not Found");
            }

            let itemUpdate = await prisma.user.update({
                where: {
                    id: item.id,
                },
                data: {
                    secret_confirm_email: crypto
                        .randomBytes(20)
                        .toString("hex"),
                },
            });

            let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    // ข้อมูลการเข้าสู่ระบบ
                    user: "sicc@sci.kmutnb.ac.th", // email user ของเรา
                    pass: "sicckmutnb78", // email password
                },
            });

            await transporter.sendMail({
                from: "ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // อีเมลผู้ส่ง
                to: itemUpdate.email, // อีเมลผู้รับ สามารถกำหนดได้มากกว่า 1 อีเมล โดยขั้นด้วย ,(Comma)
                subject:
                    "ยืนยันการรีเซ็ตรหัสผ่าน ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์", // หัวข้ออีเมล
                html:
                    "<b>ศูนย์เครื่องมือวิทยาศาสตร์และคอมพิวเตอร์สมรรถนะสูง คณะวิทยาศาสตร์ประยุกต์</b><br> โปรดรีเซ็ตรหัสผ่าน : <a href='" +
                    process.env.PATH_CLIENT +
                    "reset-password?id=" +
                    itemUpdate.id +
                    "&email=" +
                    itemUpdate.email +
                    "&secret_confirm_email=" +
                    itemUpdate.secret_confirm_email +
                    "'>คลิก</a>", // html body
            });

            res.status(201).json({
                ...item,
                msg: "success",
                password: undefined,
            });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },

    async onResetPassword(req, res) {
        try {
            const item = await prisma.user.update({
                where: {
                    id: Number(req.body.id),
                },
                data: {
                    password:
                        req.body.password != null
                            ? req.body.password
                            : undefined, //encrypt(req.body.password) : undefined,
                    updated_by: "arnonr",
                },
            });

            res.status(200).json({ ...item, msg: "success" });
        } catch (error) {
            res.status(400).json({ msg: error.message });
        }
    },
};

module.exports = { ...methods };
