using CayOcagiYonetimi.Data;
using CayOcagiYonetimi.Models;
using CayOcagiYonetimi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CayOcagiYonetimi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IUserService _userService;

        public OrdersController(ApplicationDbContext context, IUserService userService)
        {
            _context = context;
            _userService = userService;
        }

        // Tüm Siparişleri Listele (GET: api/orders)
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public IActionResult GetOrders()
        {
            var orders = _context.Orders
                .Include(o => o.User)
                .ToList();
            return Ok(orders);
        }

        // Belirli Bir Siparişi Getir (GET: api/orders/{id})
        [HttpGet("{id}")]
        public IActionResult GetOrder(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = _context.Orders
                .Include(o => o.User)
                .FirstOrDefault(o => o.id == id);

            if (order == null)
                return NotFound();

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            var orderDrinks = _context.OrderDrinks.Where(od => od.orderid == id).ToList();
            return Ok(new { order, orderDrinks });
        }

        // Yeni Sipariş Oluştur (POST: api/orders)
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] Order order)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            // Siparişi oluştur
            order.Status = OrderStatus.Pending;
            order.UserId = userId;

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrder), new { id = order.id }, order);
        }

        // Mevcut Siparişi Güncelle (PUT: api/orders/{id})
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, [FromBody] Order order)
        {
            if (id != order.id)
                return BadRequest();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrder = await _context.Orders.FindAsync(id);
            if (existingOrder == null)
                return NotFound();

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && existingOrder.UserId != userId)
                return Forbid();

            existingOrder.notes = order.notes;
            existingOrder.roomid = order.roomid;

            // Sadece admin sipariş durumunu değiştirebilir
            if (userRole == "Admin")
            {
                var oldStatus = existingOrder.Status;
                existingOrder.Status = order.Status;

                // Eğer sipariş onaylandıysa fiş sayısını düşür
                if (oldStatus == OrderStatus.Pending && order.Status == OrderStatus.Approved)
                {
                    if (existingOrder.UserId.HasValue)
                    {
                        await _userService.DecrementTicketCountAsync(existingOrder.UserId.Value);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchOrder(int id, [FromBody] Order order)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrder = await _context.Orders.FindAsync(id);
            if (existingOrder == null)
                return NotFound();

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && existingOrder.UserId != userId)
                return Forbid();

            // Not ve oda güncellemesi
            if (!string.IsNullOrEmpty(order.notes))
                existingOrder.notes = order.notes;

            if (order.roomid != 0)
                existingOrder.roomid = order.roomid;

            // Status güncellemesi (sadece admin için)
            if (userRole == "Admin" && order.Status != existingOrder.Status)
            {
                var oldStatus = existingOrder.Status;

                // Sadece bekleyen siparişlerin durumu değiştirilebilir
                if (existingOrder.Status != OrderStatus.Pending)
                {
                    return BadRequest("Sadece bekleyen siparişlerin durumu değiştirilebilir.");
                }

                // Status sadece Approved veya Rejected olabilir
                if (order.Status != OrderStatus.Approved && order.Status != OrderStatus.Rejected)
                {
                    return BadRequest("Geçersiz sipariş durumu.");
                }

                existingOrder.Status = order.Status;

                // Eğer sipariş onaylandıysa fiş sayısını düşür
                if (oldStatus == OrderStatus.Pending && order.Status == OrderStatus.Approved)
                {
                    if (existingOrder.UserId.HasValue)
                    {
                        await _userService.DecrementTicketCountAsync(existingOrder.UserId.Value);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(existingOrder);
        }

        // Siparişi Sil (DELETE: api/orders/{id})
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = await _context.Orders.FindAsync(id);
            if (order == null)
                return NotFound();

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            // Sadece bekleyen siparişler silinebilir
            if (order.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen siparişler silinebilir.");

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Tamamlanan siparişleri getirme metodu
        [HttpGet("completed")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Order>>> GetCompletedOrders()
        {
            return await _context.Orders
                .Include(o => o.User)
                .Where(o => o.Status == OrderStatus.Approved || o.Status == OrderStatus.Rejected)
                .ToListAsync();
        }

        // Bekleyen siparişleri getirme metodu
        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingOrders()
        {
            try
            {
                // Kullanıcı bilgilerini kontrol et
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRole != "Admin")
                {
                    return Forbid();
                }

                // Bekleyen siparişleri getir
                var orders = await _context.Orders
                    .Include(o => o.User)
                    .Include(o => o.OrderDrinks)
                        .ThenInclude(od => od.BeverageNavigation)
                    .Where(o => o.Status == OrderStatus.Pending)
                    .Select(o => new
                    {
                        o.id,
                        o.notes,
                        o.roomid,
                        o.Status,
                        User = o.User == null ? null : new
                        {
                            o.User.Id,
                            o.User.Username,
                            o.User.Role,
                            o.User.TicketCount
                        },
                        OrderDrinks = o.OrderDrinks.Select(od => new
                        {
                            od.id,
                            od.piece,
                            Beverage = od.BeverageNavigation == null ? null : new
                            {
                                id = od.BeverageNavigation.id,
                                name = od.BeverageNavigation.name,
                                price = od.BeverageNavigation.price
                            }
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = orders,
                    count = orders.Count
                });
            }
            catch (Exception ex)
            {
                // Hata loglaması
                return StatusCode(500, new
                {
                    success = false,
                    error = "Bekleyen siparişler alınırken bir hata oluştu",
                    details = ex.Message
                });
            }
        }

        // Kullanıcının kendi siparişlerini getirme metodu
        [HttpGet("my-orders")]
        public async Task<ActionResult<IEnumerable<Order>>> GetMyOrders()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            return await _context.Orders
                .Where(o => o.UserId == userId)
                .ToListAsync();
        }

        // Tüm Siparişleri Sil (DELETE: api/orders/all)
        [HttpDelete("all")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteAllOrders()
        {
            try
            {
                // Önce ilişkili OrderDrinks kayıtlarını sil
                var orderDrinks = _context.OrderDrinks.ToList();
                _context.OrderDrinks.RemoveRange(orderDrinks);

                // Sonra tüm siparişleri sil
                var orders = _context.Orders.ToList();
                _context.Orders.RemoveRange(orders);
                
                _context.SaveChanges();

                return Ok("Tüm siparişler başarıyla silindi.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Siparişler silinirken bir hata oluştu: {ex.Message}");
            }
        }
    }
}
