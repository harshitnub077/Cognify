"""
Fine-tuning script for the Cognify "Harsh Coach" Persona.

This script demonstrates how to fine-tune a small foundation model (like TinyLlama or Phi-3) 
to adopt the harsh-but-fair coaching persona using LoRA (Low-Rank Adaptation).

Hardware Requirements:
- At least 1 GPU (e.g., T4 on Google Colab or locally if you have an RTX card)
- 8GB+ VRAM

Dependencies (Install via pip):
pip install torch transformers peft trl datasets accelerate
"""

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# 1. Configuration
MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
OUTPUT_DIR = "./coach-model-finetuned"
DATASET_PATH = "coach_dataset.json"

def format_instruction(sample):
    """
    Format the dataset into the ChatML or specific template the model expects.
    For TinyLlama chat, it looks like:
    <|system|>
    {system_message}</s>
    <|user|>
    {user_message}</s>
    <|assistant|>
    {assistant_message}</s>
    """
    return f"<|system|>\n{sample['instruction']}</s>\n<|user|>\n{sample['input']}</s>\n<|assistant|>\n{sample['output']}</s>"

def main():
    print("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    tokenizer.pad_token = tokenizer.eos_token

    # Load model in bfloat16 for memory efficiency (if supported)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        device_map="auto"
    )

    # 2. Apply LoRA (Parameter-Efficient Fine-Tuning)
    # We only train a tiny percentage of the weights, making it feasible on consumer hardware
    peft_config = LoraConfig(
        r=16, 
        lora_alpha=32, 
        target_modules=["q_proj", "v_proj"], # targeting attention modules
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 3. Prepare Dataset
    print("Loading dataset...")
    dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

    # 4. Configure Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=5,
        max_steps=100, # In reality, you'd do epochs (e.g., num_train_epochs=3)
        save_strategy="epoch",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        optim="paged_adamw_32bit" # Requires bitsandbytes if using 8-bit/4-bit
    )

    # 5. Initialize Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text", # We'll format this below
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
        formatting_func=lambda x: [format_instruction(item) for item in zip(x['instruction'], x['input'], x['output'])]
    )
    # Patch formatting func for mapping
    def process(batch):
        batch["text"] = [format_instruction({"instruction": i, "input": inp, "output": o}) for i, inp, o in zip(batch["instruction"], batch["input"], batch["output"])]
        return batch
    dataset = dataset.map(process, batched=True)
    
    # Re-init trainer with pre-formatted text
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text", 
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
    )

    # 6. Train!
    print("Starting fine-tuning...")
    trainer.train()

    # 7. Save the model adapter
    print(f"Saving fine-tuned adapter to {OUTPUT_DIR}")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("\n✅ Fine-tuning complete. You can now load this adapter on top of the base model.")

if __name__ == "__main__":
    main()
