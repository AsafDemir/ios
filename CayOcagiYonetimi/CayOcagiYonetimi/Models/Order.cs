namespace CayOcagiYonetimi.Models
{
    public class Order
    {
        public int id { get; set; }
        public string? notes { get; set; }
        public int roomid { get; set; }
        public OrderStatus Status { get; set; } = OrderStatus.Pending;
        
        // User ilişkisi için yeni alanlar - nullable olarak tanımlandı
        public int? UserId { get; set; }
        public virtual User? User { get; set; }

        // OrderDrinks navigation property'si
        public virtual ICollection<OrderDrink> OrderDrinks { get; set; } = new List<OrderDrink>();
    }
}
