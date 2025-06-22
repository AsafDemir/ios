using CayOcagiYonetimi.Data;
using CayOcagiYonetimi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CayOcagiYonetimi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrderdrinksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OrderdrinksController(ApplicationDbContext context)
        {
            _context = context;
        }

        // Tüm Sipariş İçeceklerini Listele (GET: api/orderdrinks)
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOrderDrinks()
        {
            var orderDrinks = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .ToListAsync();
            return Ok(orderDrinks);
        }

        // Belirli Bir Sipariş İçeceğini Getir (GET: api/orderdrinks/{id})
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderDrink(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var orderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (orderDrink == null)
                return NotFound();

            // Admin değilse ve kendi siparişine ait değilse erişimi engelle
            if (userRole != "Admin" && orderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            return Ok(orderDrink);
        }

        // Yeni Sipariş İçeceği Ekle (POST: api/orderdrinks)
        [HttpPost]
        public async Task<IActionResult> CreateOrderDrink([FromBody] OrderDrink orderDrink)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Siparişin varlığını ve kullanıcıya ait olduğunu kontrol et
            var order = await _context.Orders.FindAsync(orderDrink.orderid);
            if (order == null)
                return BadRequest("Geçersiz sipariş ID'si");

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            // Sipariş beklemede değilse içecek eklenemez
            if (order.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen siparişlere içecek eklenebilir.");

            // İçeceğin aktif olduğunu kontrol et
            var beverage = await _context.Beverages.FindAsync(orderDrink.beverageid);
            if (beverage == null || !beverage.active.GetValueOrDefault())
                return BadRequest("Geçersiz veya aktif olmayan içecek.");

            _context.OrderDrinks.Add(orderDrink);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrderDrink), new { id = orderDrink.id }, orderDrink);
        }

        // Mevcut Sipariş İçeceğini Güncelle (PUT: api/orderdrinks/{id})
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrderDrink(int id, [FromBody] OrderDrink orderDrink)
        {
            if (id != orderDrink.id)
                return BadRequest();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (existingOrderDrink == null)
                return NotFound();

            // Admin değilse ve kendi siparişine ait değilse erişimi engelle
            if (userRole != "Admin" && existingOrderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipariş beklemede değilse güncellenemez
            if (existingOrderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen siparişlerdeki içecekler güncellenebilir.");

            // İçeceğin aktif olduğunu kontrol et
            var beverage = await _context.Beverages.FindAsync(orderDrink.beverageid);
            if (beverage == null || !beverage.active.GetValueOrDefault())
                return BadRequest("Geçersiz veya aktif olmayan içecek.");

            existingOrderDrink.beverageid = orderDrink.beverageid;
            existingOrderDrink.piece = orderDrink.piece;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchOrderDrink(int id, [FromBody] OrderDrink orderDrink)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var existingOrderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (existingOrderDrink == null)
                return NotFound();

            // Admin değilse ve kendi siparişine ait değilse erişimi engelle
            if (userRole != "Admin" && existingOrderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipariş beklemede değilse güncellenemez
            if (existingOrderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen siparişlerdeki içecekler güncellenebilir.");

            if (orderDrink.beverageid != 0)
            {
                // İçeceğin aktif olduğunu kontrol et
                var beverage = await _context.Beverages.FindAsync(orderDrink.beverageid);
                if (beverage == null || !beverage.active.GetValueOrDefault())
                    return BadRequest("Geçersiz veya aktif olmayan içecek.");

                existingOrderDrink.beverageid = orderDrink.beverageid;
            }

            if (orderDrink.piece > 0)
                existingOrderDrink.piece = orderDrink.piece;

            await _context.SaveChangesAsync();
            return Ok(existingOrderDrink);
        }

        // Sipariş İçeceğini Sil (DELETE: api/orderdrinks/{id})
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrderDrink(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var orderDrink = await _context.OrderDrinks
                .Include(od => od.OrderNavigation)
                .FirstOrDefaultAsync(od => od.id == id);

            if (orderDrink == null)
                return NotFound();

            // Admin değilse ve kendi siparişine ait değilse erişimi engelle
            if (userRole != "Admin" && orderDrink.OrderNavigation?.UserId != userId)
                return Forbid();

            // Sipariş beklemede değilse içecek silinemez
            if (orderDrink.OrderNavigation?.Status != OrderStatus.Pending)
                return BadRequest("Sadece bekleyen siparişlerden içecek silinebilir.");

            _context.OrderDrinks.Remove(orderDrink);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Belirli bir siparişe ait içecekleri getir
        [HttpGet("by-order/{orderId}")]
        public async Task<IActionResult> GetOrderDrinksByOrder(int orderId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var order = await _context.Orders.FindAsync(orderId);
            if (order == null)
                return NotFound("Sipariş bulunamadı.");

            // Admin değilse ve kendi siparişi değilse erişimi engelle
            if (userRole != "Admin" && order.UserId != userId)
                return Forbid();

            var orderDrinks = await _context.OrderDrinks
                .Where(od => od.orderid == orderId)
                .Include(od => od.OrderNavigation)
                .Include(od => od.BeverageNavigation)
                .ToListAsync();

            return Ok(orderDrinks);
        }
    }
}
