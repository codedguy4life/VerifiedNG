const jwt = require('jsonwebtoken');

// TEMPORARY fake database
const users = [];

// REGISTER
const register = async (req, res) => {
  try {
    const { fullName, email, password, phone, role } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const newUser = {
      id: users.length + 1,
      fullName,
      email,
      password,
      phone,
      role: role || 'customer'
    };

    users.push(newUser);

    res.status(201).json({
      message: 'Account created successfully!',
      user: newUser
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check fields provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // 2. Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 3. Check password matches
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Send back token
    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login };