const express = require('express');
const mssql = require('mssql/msnodesqlv8');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname + '/view')));
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
  driver: 'msnodesqlv8',
  connectionString: 'Driver={SQL Server};Server=.;Database=ProjectI;Trusted_Connection=yes;',
};



app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input('username', mssql.NVarChar, username)
      .input('password', mssql.NVarChar, password)
      .query('SELECT * FROM UserInfo WHERE UserName = @username AND Pass = @password');

    if (result.recordset.length > 0) {
      const role = result.recordset[0].Role; // Lấy giá trị của cột Role
      res.redirect(`/home${role.charAt(0).toUpperCase() + role.slice(1)}.html`); // Chuyển hướng dựa trên vai trò
    } else {
      res.redirect('/signin.html?loginError=true');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/register', async (req, res) => {
  const { username, password, name, gender, email, phonenumber } = req.body;

  try {
    const pool = await mssql.connect(config);
    const request = pool.request();
    const request2 = pool.request();

    // Kiểm tra giá trị username trước khi thêm vào cơ sở dữ liệu
    const usernameCheck = await request2
      .input('username', mssql.NVarChar, username)
      .query('SELECT COUNT(*) AS count FROM UserInfo WHERE UserName = @username');

    if (usernameCheck.recordset[0].count > 0) {
      // Người dùng đã tồn tại, hiển thị alert và chuyển hướng
      return res.send('<script>alert("Người dùng đã tồn tại. Vui lòng chọn tên đăng nhập khác."); window.location.href="/signup.html?signupError=true";</script>');
    }

    request.input('username', mssql.NVarChar, username);
    request.input('password', mssql.NVarChar, password);
    request.input('name', mssql.NVarChar, name);
    request.input('gender', mssql.NVarChar, gender || '');
    request.input('email', mssql.NVarChar, email || '');
    request.input('phonenumber', mssql.NVarChar, phonenumber || '');

    // Thực hiện truy vấn SQL
    const result = await request
      .query('INSERT INTO UserInfo (UserName, Pass, Name, Gender, Email, PhoneNumber) VALUES (@username, @password, @name, @gender, @email, @phonenumber)');

    if (result.rowsAffected.length > 0) {
      // Trong trường hợp đăng ký thành công
      res.redirect('/index.html?signupSuccess=true');
    } else {
      // Trong trường hợp đăng ký thất bại
      res.redirect('/signup.html?signupError=true');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});

app.get('/accounts', async (req, res) => {
  try {
    const pool = await mssql.connect(config);
    const result = await pool.request().query('SELECT * FROM UserInfo');

    const accounts = result.recordset;
    res.send(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Trong endpoint /getCarModels
app.get('/getCarModels', async (req, res) => {
  try {
    const pool = await mssql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        CM.Name, 
        CM.Year, 
        CM.EngineType, 
        CM.FuelType, 
        CM.Transmission, 
        CM.Seats, 
        CD.Introduction, 
        CD.ImageURL
      FROM CarModels AS CM
      INNER JOIN CarDescriptions AS CD ON CM.ModelID = CD.ModelID
    `);

    const cars = result.recordset;
    res.send(cars);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



//manage account admin
// Tìm kiếm tài khoản theo UserName
app.get('/searchAccount', async (req, res) => {
  const { username } = req.query;

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input('username', mssql.NVarChar, username)
      .query('SELECT * FROM UserInfo WHERE UserName = @username');

    const searchResult = result.recordset;
    res.send(searchResult);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Cập nhật vai trò của tài khoản
app.post('/updateRole', async (req, res) => {
  const { username, role } = req.body;

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input('username', mssql.NVarChar, username)
      .input('role', mssql.NVarChar, role)
      .query('UPDATE UserInfo SET Role = @role WHERE UserName = @username');

    if (result.rowsAffected.length > 0) {
      res.send('Update successful');
    } else {
      res.send('Update failed');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// New endpoint for deleting an account
app.post('/deleteAccount', async (req, res) => {
  const { username } = req.body;

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input('username', mssql.NVarChar, username)
      .query('DELETE FROM UserInfo WHERE UserName = @username');

    if (result.rowsAffected.length > 0) {
      res.send('Delete successful');
    } else {
      res.send('Delete failed');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint for handling rental orders
app.post('/rentalOrder', async (req, res) => {
  const { HoTen, DiaChi, SoDienThoai, TenXe, NgayLayXe, NgayTraXe } = req.body;

  try {
    const pool = await mssql.connect(config);

    const pickupDate = new Date(NgayLayXe);
const returnDate = new Date(NgayTraXe);

// Chuyển định dạng ngày tháng thành 'yyyy-mm-dd'
const formattedPickupDate = pickupDate.toISOString().split('T')[0];
const formattedReturnDate = returnDate.toISOString().split('T')[0];

const result = await pool.request()
  .input('CustomerName', mssql.NVarChar, HoTen)
  .input('CustomerAddress', mssql.NVarChar, DiaChi)
  .input('PhoneNumber', mssql.NVarChar, SoDienThoai)
  .input('CarName', mssql.NVarChar, TenXe)
  .input('PickupDate', mssql.NVarChar, formattedPickupDate)
  .input('ReturnDate', mssql.NVarChar, formattedReturnDate)
  .query(`
    INSERT INTO RentalOrders (CustomerName, CustomerAddress, PhoneNumber, CarName, PickupDate, ReturnDate)
    VALUES (@CustomerName, @CustomerAddress, @PhoneNumber, @CarName, @PickupDate, @ReturnDate)
  `);



  if (result.rowsAffected.length > 0) {
    // Hiển thị thông báo thành công
    return res.status(201).send('<script>alert("Đăng ký thuê xe thành công"); window.location.href="/RentCarCustomer.html";</script>');
  } else {
    // Hiển thị thông báo thất bại
    return res.status(500).send('<script>alert("Đăng ký thuê xe thất bại"); window.location.href="/RentCarCustomer.html";</script>');
  }
} catch (error) {
  console.error('Error:', error);
  // Hiển thị thông báo lỗi nếu có lỗi trong quá trình xử lý
  return res.status(500).send('<script>alert("Lỗi Server Nội bộ"); window.location.href="/RentCar.html";</script>');
}
});


// Endpoint để lấy dữ liệu từ bảng RentalOrders
app.get('/getRentalOrders', async (req, res) => {
  try {
    const pool = await mssql.connect(config);
    const request = pool.request();
    const result = await request.query('SELECT * FROM RentalOrders');

    // Gửi dữ liệu về trang HTML
    res.json(result.recordset);
  } catch (error) {
    console.error('SQL error', error);
    res.status(500).send('Internal Server Error');
  }
});

// Thêm endpoint để cập nhật trạng thái đơn đặt hàng
app.post('/updateOrderStatus', async (req, res) => {
  const { orderId, temporaryStatus } = req.body;

  try {
    const pool = await mssql.connect(config);
    const result = await pool.request()
      .input('orderId', mssql.Int, orderId)
      .input('temporaryStatus', mssql.NVarChar, temporaryStatus)
      // Thay đổi truy vấn SQL trong endpoint /updateOrderStatus
      .query('UPDATE RentalOrders SET OrderStatus = @temporaryStatus WHERE OrderID = @orderId');

    if (result.rowsAffected.length > 0) {
      res.send('Update successful');
    } else {
      res.send('Update failed');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});








const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
