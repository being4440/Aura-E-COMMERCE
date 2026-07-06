const axios = require('axios');

async function test() {
  try {
    const ts = Date.now();
    const resReg = await axios.post('http://localhost:5000/api/auth/register', {
      username: `testuser_${ts}`,
      email: `test_${ts}@example.com`,
      password: 'password123'
    });
    console.log('Register success:', resReg.data.success);
    const token = resReg.data.token;

    const resCart = await axios.post('http://localhost:5000/api/cart/add', {
      productId: '64fa12345678901234567890',
      name: 'Luxury Watch',
      price: 1200,
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
      brand: 'AURA',
      maxStock: 5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Cart add success:', resCart.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
